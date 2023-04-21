import './fetch-polyfill.js';

// const DomainHost = 'http://localhost:3333';
const DomainHost = 'https://prod-sdk-api.my.webinfra.cloud';
const cacheKeyTTL = 1000 * 3600 * 24;

const getCustomerInfo = async (userToken) => {
    const sdkHost = `${DomainHost}/api/sdk/customer`;
    return fetch(sdkHost, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
        },
    })
        .then(resp => resp.json());
};

const increCntLocal = async (uid, cache) => {
    const cacheKey = `cnt-${uid}`;
    const dateStr = new Date().toDateString().replace(/\s/igm, '-');
    const cacheData = await cache.get(cacheKey);
    if (!cacheData) {
        await cache.set(cacheKey, {
            date: dateStr,
            cnt: 1,
        }, cacheKeyTTL);
    }
    await cache.set(cacheKey, {
        date: dateStr,
        cnt: (cacheData.cnt || 0) + 1,
    }, cacheKeyTTL);
};

export const checkLimit = async ({
    uid,
    token,
    question,
    cache,
}) => {
    console.log('checking limit', uid, token, question);

    const userInfo = getCustomerInfo(token);
    console.log('resp - ', userInfo);

    if (userInfo?.success) {
        const profile = userInfo.data?.profile;
        // 强制用户订阅，免费版或者付费版二选一
        if (!profile) {
            throw new Error('用户未订阅');
        }
        if (profile?.amount > 0) {
            return {
                success: true,
                data: {
                    charged: true, // 付费额度
                    cnt: profile.amount,
                },
            };
        }
        // 计算免费额度
        const curDateStr = new Date().toDateString().replace(/\s/igm, '-');
        const cacheKey = `cnt-${uid}`;
        const cntData = await cache.get(cacheKey);
        if (!cntData || (cntData.date !== curDateStr)) {
            console.log('cache miss: ', cntData?.date, cacheKey);
            await cache.set(cacheKey, {
                date: curDateStr,
                cnt: 0,
            }, cacheKeyTTL);
            return {
                success: true,
                data: {
                    date: curDateStr,
                    charged: false, // 免费额度
                    cnt: process.env.FREE_CNT_PER_DAY,
                },
            };
        }
        const { date, cnt } = cntData;
        console.log('cache hit: ', date, cnt);
        if (cnt >= process.env.FREE_CNT_PER_DAY) {
            return {
                success: false,
                data: {
                    date,
                    charged: false, // 免费额度
                    cnt: 0,
                },
            };
        }
        return {
            success: true,
            data: {
                date,
                charged: false, // 免费额度
                cnt: process.env.FREE_CNT_PER_DAY - cnt,
            },
        };
    }
    return {
        success: false,
        data: userInfo?.data,
        message: userInfo?.message,
        code: userInfo?.errorCode,
    };
};

export const userAmountFeedback = async (option) => {
    const {
        uid,
        token,
        charged,
        cache,
    } = option || {};
    if (charged) {
        console.log('user profile amount update - ', uid);
        // 付费额度更新
        const sdkHost = `${DomainHost}/api/sdk/customer/amount`;
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
    return increCntLocal(uid, cache);
};

export default {
    checkLimit,
    userAmountFeedback,
};
