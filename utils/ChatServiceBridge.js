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
    if (settings) {
        return settings;
    }
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
    const { perMessageClientOptionsWhitelist, clientToUseForMessage } = await getContext();
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

const DomainHost = 'https://prod-sdk-api.my.webinfra.cloud';
const cacheKeyPerDayTTL = 3600 * 24;

const getCustomerInfo = async (userToken) => {
    const { webinfraConfig } = await getContext();
    const sdkHost = `${webinfraConfig?.host || DomainHost}/api/sdk/customer`;
    return fetch(sdkHost, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
        },
    })
        .then(resp => resp.json());
};

const increCntLocal = async (uid) => {
    const cacheKey = `cnt-${uid}`;
    const dateStr = new Date().toDateString().replace(/\s/igm, '-');
    const { conversationsCache } = await getContext();
    const cacheData = await conversationsCache.get(cacheKey);
    if (!cacheData) {
        console.log('create local user cnt: ', cacheKey)
        return conversationsCache.set(cacheKey, {
            date: dateStr,
            cnt: 1,
        });
    }
    console.log('incre local user cnt: ', cacheKey, cacheData.cnt)
    return conversationsCache.set(cacheKey, {
        date: dateStr,
        cnt: (cacheData.cnt || 0) + 1,
    }, {
        ex: cacheKeyPerDayTTL
    });
};

const getFreeCnt = (freeCnt) => {
    let freeCntNum = freeCnt ? Number(freeCnt) : 20;
    if (!(freeCntNum > 0)) {
        // 非法配置
        console.error('FREE_CNT_PER_DAY 无效配置，重置为20');
        freeCntNum = 20;
    }
    return freeCntNum;
};

export const checkLimit = async ({
    uid,
    token,
}) => {
    console.log('checking limit', uid, token);
    const userInfo = await getCustomerInfo(token);
    console.log('resp - ', userInfo);

    if (userInfo?.success) {
        const profile = userInfo.data?.profile;
        // 强制用户订阅，免费版或者付费版二选一
        if (!profile) {
            throw new Error('用户未订阅');
        }
        //  有付费额度
        if ((profile?.amount > 0) && (new Date(profile.expireAt).valueOf() > Date.now())) {
            return {
                success: true,
                data: {
                    charged: true, // 付费额度
                    cnt: profile.amount,
                },
            };
        } else {
            console.log(' no valid amount ');
        }
        // 计算免费额度
        const curDateStr = new Date().toDateString().replace(/\s/igm, '-');
        const cacheKey = `cnt-${uid}`;
        const { conversationsCache, freeCntPerDay } = await getContext()
        const freeCnt = getFreeCnt(freeCntPerDay);

        const cntData = await conversationsCache.get(cacheKey);
        if (!cntData || (cntData.date !== curDateStr)) {
            console.log('cache miss: ', cntData?.date, cacheKey);
            await conversationsCache.set(cacheKey, {
                date: curDateStr,
                cnt: 0,
            }, {
                ex: cacheKeyPerDayTTL, // 1 day
            });
            return {
                success: true,
                data: {
                    date: curDateStr,
                    charged: false, // 免费额度
                    cnt: freeCnt,
                },
            };
        }
        const { date, cnt } = cntData;
        console.log('cache hit: ', date, cnt);
        if (cnt >= freeCnt) {
            // 超出免费额度，需要付费
            return {
                success: false,
                message: 'Request Limited',
                data: {
                    date,
                    charged: false, // 免费额度
                    cnt: 0,
                },
            };
        }
        // 免费额度可用
        return {
            success: true,
            data: {
                date,
                charged: false, // 免费额度
                cnt: freeCnt - cnt,
            },
        };
    }
    return {
        success: false,
        data: userInfo?.data,
        message: userInfo?.message || '获取用户信息失败',
        code: userInfo?.errorCode,
    };
};

export const userAmountFeedback = async (option) => {
    const {
        uid,
        token,
        charged,
    } = option || {};
    if (charged) {
        console.log('user profile amount update - ', uid);
        // 付费额度更新
        const { webinfraConfig } = await getContext();
        const sdkHost = `${webinfraConfig?.host || DomainHost}/api/sdk/customer/amount`;
        return fetch(sdkHost, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                uid,
                action: 'decrement',
                count: 1,
            }),
        }).then(resp => resp.json());
    }
    // 更新免费额度
    console.log('user free amount update - ', uid);
    return increCntLocal(uid);
};


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
    let openedConnection = false;
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
        openedConnection = true;
        let reportStr = '';
        let lastChunk = '';
        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = decoder.decode(value);
            console.log('read chunk: ', chunkValue);
            if (chunkValue) {
                if (reportStr) {
                    reportStr += chunkValue;
                } else {
                    const concatStr = `${lastChunk.trim()}${chunkValue.trim()}`;
                    const tokenIdx = concatStr.indexOf('[__REPORT__]');
                    if (tokenIdx > -1) {
                        console.log('token detected: ', tokenIdx, concatStr, tokenIdx - lastChunk.length);
                        reportStr = concatStr.slice(tokenIdx + 12) || ' ';
                        // 临界情况
                        if (lastChunk.length > tokenIdx) {
                            reply = reply.slice(0, tokenIdx - lastChunk.length)
                        }
                    }  else {
                        onmessage(chunkValue);
                        reply += chunkValue
                        lastChunk = chunkValue;
                    }
                }
                // TODO: Error event handler
            }
        }
        console.log('final reply: ', reply);
        console.log('final reportStr: ', reportStr);

        // 连接意外中断，没有收到report数据
        if (!reportStr) {
            console.error('no reply meta data found')
            throw new Error('No reply meta data')
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
        return resultObj;
    } catch (err) {
        console.error('ERROR ', err);
        if (openedConnection) {
            console.log('connection close event');
            onclose()
        } else {
            console.log('connection error event');
            onerror(err)
        }
    }
}
