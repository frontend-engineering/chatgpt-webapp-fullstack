// Run the server first with `npm run server`
import { fetchEventSource } from '@fortaine/fetch-event-source';
import ChatGPTClient from './client/ChatGPTClient'
// import { HOST_URL } from './config'
export const HOST_URL = 'http://localhost:3000';
let settings;

export const getSettings = async () => {
    if (!settings) {
        console.log('importing ...')
        settings = (await import('./Settings')).default;
    }
    console.log('settings : ', settings);
    if (!settings) {
        console.error('Error: the settings.js file does not exist.');
        throw new Error('Settings not found')
    }

    settings.cacheOptions.store = new KeyvFile({});

    const clientToUse = settings.apiOptions?.clientToUse || settings.clientToUse || 'chatgpt';
    const conversationsCache = new Keyv(settings.cacheOptions);

    const perMessageClientOptionsWhitelist = settings.apiOptions?.perMessageClientOptionsWhitelist || null;
    return {
        ...settings,
        clientToUse,
        conversationsCache,
        perMessageClientOptionsWhitelist,
    }
}

export async function getClient() {
    settings = await getSettings();

    let clientToUseForMessage = settings.clientToUse;
    const clientOptions = filterClientOptions(body.clientOptions, clientToUseForMessage);
    if (clientOptions && clientOptions.clientToUse) {
        clientToUseForMessage = clientOptions.clientToUse;
        delete clientOptions.clientToUse;
    }
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
export function filterClientOptions(inputOptions) {
    const { perMessageClientOptionsWhitelist, clientToUseForMessage } = settings;
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

    try {
        let reply = '';
        let msgId = '';
        let conversationId = '';
        const controller = new AbortController();
        let aborted = false;
        if (getSignal) {
            getSignal(controller);
        }


        // const response = await fetch("/v2/api/chat", {
        //     ...opts,
        //     signal: controller.signal,
        //   });

        //   if (!response.ok) {
        //     throw new Error(response.statusText);
        //   }

        //   // This data is a ReadableStream
        //   const data = response.body;
        //   if (!data) {
        //     return;
        //   }

        //   const reader = data.getReader();
        //   const decoder = new TextDecoder();
        //   let done = false;

        //   while (!done) {
        //     const { value, done: doneReading } = await reader.read();
        //     done = doneReading;
        //     const chunkValue = decoder.decode(value);

        //     if (message.data === '[DONE]') {
        //         console.log('done: ', message);
        //         controller.abort();
        //         aborted = true;
        //         return;
        //     }
        //     if (message.event === 'result') {
        //         const result = JSON.parse(message.data);                            
        //         console.log('result: ', result.response);
        //         msgId = result.messageId;
        //         conversationId = result.conversationId;
        //         const finalResp = result.response;
        //         if (finalResp?.length > reply?.length) {
        //             console.log('use returned full response: ', finalResp);
        //             reply = finalResp;
        //         }
        //         return;
        //     }
        //     if (message?.event === 'error') {
        //         onerror && onerror(message.data);
        //         return;
        //     }
        //     if (onmessage) {
        //         onmessage(message);
        //     }
        //     console.log('onmessage: ', message);
        //     reply += JSON.parse(message.data);


        //     reply += chunkValue;
        //   } 


        const response = await fetch(`/api/chat`, {
            ...opts,
            signal: controller.signal,
            onopen(response) {
                console.log('internal open: ', response);
                if (response.status === 200) {
                    onopen()
                    return;
                }
                const err = new Error(`Failed to send message. HTTP ${response.status} - ${response.statusText}`);
                if (onerror) {
                    onerror(err)
                } else {
                    throw err;
                }
            },
            onclose() {
                console.warn('internal close')
                const error = new Error(`Failed to send message. Server closed the connection unexpectedly.`);
                if (onclose) {
                    onclose(error);
                } else {
                    throw error;
                }
            },
            onerror(err) {
                console.error('internal error: ', err);
                if (onerror) {
                    onerror(err);
                } else {
                    throw err;
                }
            },
            onmessage(message) {
                // { data: 'Hello', event: '', id: '', retry: undefined }
                if (aborted) {
                    return;
                }
                if (message.data === '[DONE]') {
                    console.log('done: ', message);
                    controller.abort();
                    aborted = true;
                    return;
                }
                if (message.event === 'result') {
                    const result = JSON.parse(message.data);
                    console.log('result: ', result.response);
                    msgId = result.messageId;
                    conversationId = result.conversationId;
                    const finalResp = result.response;
                    if (finalResp?.length > reply?.length) {
                        console.log('use returned full response: ', finalResp);
                        reply = finalResp;
                    }
                    return;
                }
                if (message?.event === 'error') {
                    onerror && onerror(message.data);
                    return;
                }
                if (onmessage) {
                    onmessage(message);
                }
                console.log('onmessage: ', message);
                reply += JSON.parse(message.data);
            },
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
  
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        console.log('read chunk: ', chunkValue);
        reply += chunkValue
        // setGeneratedBios((prev) => prev + chunkValue);
      }
        console.log('final reply: ', reply);

        return {
            response: reply,
            messageId: msgId,
            conversationId: conversationId,
        };
    } catch (err) {
        console.error('ERROR ', err);
        throw err;
    }
}
