// Run the server first with `npm run server`
import { getAll } from '@vercel/edge-config';
import ObjCache from './ObjCacheWrap';
// import Keyv from './KeyvConnector';
import ChatGPTClient from './client/ChatGPTClient'
// import { HOST_URL } from './config'
export const HOST_URL = 'http://localhost:3000';
let settings;

// =====================
// Server side functions
// =====================
export const getContext = async () => {
    const config = await getAll();
    console.log('---get config---', config);

    if (!config) {
        console.error('Error: need setup vercel config first');
        throw new Error('config not found')
    }

    const clientToUse = config.apiOptions?.clientToUse || settings.clientToUse || 'chatgpt';
    // console.log('create keyv from url: ', process.env.ChatKV_URL);
    // if (!process.env.ChatKV_URL) {
    //     throw new Error('redis kv is not setup');
    // }
    // config.cacheOptions.store = new Keyv(process.env.ChatKV_URL)
    // console.log('debug----', Keyv);

    const conversationsCache = new ObjCache();

    const perMessageClientOptionsWhitelist = config.apiOptions?.perMessageClientOptionsWhitelist || null;
    settings = {
        ...config,
        clientToUse,
        conversationsCache,
        perMessageClientOptionsWhitelist,
    }

    return {
        ...config,
        clientToUse,
        conversationsCache,
        perMessageClientOptionsWhitelist,
    }
}

export async function getClient(clientToUse) {
    await getContext();

    let clientToUseForMessage = clientToUse || settings.clientToUse;

    switch (clientToUseForMessage) {
        // case 'bing':
        //     return new BingAIClient(settings.bingAiClient);
        // case 'chatgpt-browser':
        //     return new ChatGPTBrowserClient(
        //         settings.chatGptBrowserClient,
        //         settings.cacheOptions,
        //     );
        case 'chatgpt':
            settings.cacheOptions.namespace = settings.cacheOptions.namespace || 'chatgpt';
            // eslint-disable-next-line no-case-declarations
            let configApiKey = settings.openaiApiKey || settings.chatGptClient.openaiApiKey;
            if (!configApiKey) {
                throw new Error('Api Key not config');
            }
            if (configApiKey?.indexOf(',') > -1) {
                const keys = configApiKey.split(',');
                configApiKey = keys[Math.floor(Math.random() * keys.length)];
            }
            return new ChatGPTClient(
                configApiKey,
                settings.conversationsCache,
                settings.chatGptClient,
                settings.cacheOptions,
            );
        default:
            throw new Error(`Invalid clientToUse: ${clientToUseForMessage}`);
    }
}

/**
 * Filter objects to only include whitelisted properties set in
 * `settings.js` > `apiOptions.perMessageClientOptionsWhitelist`.
 * Returns original object if no whitelist is set.
 * @param {*} inputOptions
 */
export async function filterClientOptions(inputOptions) {
    const { perMessageClientOptionsWhitelist, clientToUseForMessage } = settings || (await getContext());
    if (!inputOptions || !perMessageClientOptionsWhitelist) {
        return null;
    }

    // If inputOptions.clientToUse is set and is in the whitelist, use it instead of the default
    if (
        perMessageClientOptionsWhitelist.validClientsToUse
        && inputOptions.clientToUse
        && perMessageClientOptionsWhitelist.validClientsToUse.includes(inputOptions.clientToUse)
    ) {
        settings.clientToUseForMessage = inputOptions.clientToUse;
    } else {
        inputOptions.clientToUse = clientToUseForMessage;
    }

    const whitelist = perMessageClientOptionsWhitelist[clientToUseForMessage];
    if (!whitelist) {
        // No whitelist, return all options
        return inputOptions;
    }

    const outputOptions = {};

    for (const property of Object.keys(inputOptions)) {
        const allowed = whitelist.includes(property);

        if (!allowed && typeof inputOptions[property] === 'object') {
            // Check for nested properties
            for (const nestedProp of Object.keys(inputOptions[property])) {
                const nestedAllowed = whitelist.includes(`${property}.${nestedProp}`);
                if (nestedAllowed) {
                    outputOptions[property] = outputOptions[property] || {};
                    outputOptions[property][nestedProp] = inputOptions[property][nestedProp];
                }
            }
            continue;
        }

        // Copy allowed properties to outputOptions
        if (allowed) {
            outputOptions[property] = inputOptions[property];
        }
    }

    return outputOptions;
}

// =====================
// Client side functions
// =====================
export const callBridge = async (options) => {
    const { data, onmessage, onopen, onclose, onerror, getSignal } = options || {}
    if (!data?.message) {
        throw new Error('Empty Input Message');
    }
    let clientOptions = {};
    if (data.prompt) {
        clientOptions.promptPrefix = data.prompt;
        delete data.prompt;
    }
    const opts = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...(data || {}),
            // Set stream to true to receive each token as it is generated.
            stream: true,
            clientOptions,
        }),
    };

    console.log('start call brdige...', new Date());
    try {
        let reply = '';
        let msgId = '';
        let conversationId = '';
        const controller = new AbortController();
        let aborted = false;
        if (getSignal) {
            getSignal(controller);
        }

        const response = await fetch(`/api/chat`, {
            ...opts,
            signal: controller.signal,
        });


        if (!response.ok) {
            throw new Error(response.statusText);
        }

        // This data is a ReadableStream
        const data = response.body;
        if (!data) {
            return;
        }

        const reader = data.getReader();
        const decoder = new TextDecoder();
        let done = false;

        await onopen()
        let reportStr = '';
        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = decoder.decode(value);
            console.log('read chunk: ', chunkValue);
            if (chunkValue) {
                if (chunkValue.startsWith('[REPORT]')) {
                    reportStr = chunkValue.slice(8) || ' ';
                } else if (reportStr) {
                    reportStr += chunkValue;
                } else {
                    onmessage(chunkValue);
                    // TODO: Error event handler
                    reply += chunkValue
                }
            }
        }
        console.log('final reply: ', reply, reportStr);
        if (!reportStr) {
            console.error('no request report data found')
            return;
        }
        const resp = JSON.parse(reportStr);
        console.log('report: ', resp)
        msgId = resp.id;
        conversationId = resp.conversationId;
        const finalResp = resp.message;
        if (finalResp?.length > reply?.length) {
            console.log('use returned full response: ', finalResp);
            reply = finalResp;
        }
        const resultObj = {
            response: reply,
            messageId: msgId,
            conversationId: conversationId,
        };
        // Done: Result accept
        onclose(resultObj)
        return resultObj;
    } catch (err) {
        console.error('ERROR ', err);
        onerror(err)
    }
}
