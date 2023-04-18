import './fetch-polyfill.js';

const DomainHost = 'http://localhost:3333';

export const checkLimit = async (uid, token) => {
    console.log('checking limit', uid, token);

    const sdkHost = `${DomainHost}/api/sdk/customer`;
    return fetch(sdkHost, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    })
        .then(resp => resp.json())
        .then((resp) => {
            console.log('resp - ', resp);
            if (resp?.success) {
                const profile = resp.data?.profile;
                if (!profile) {
                    throw new Error('用户未订阅');
                }
                if (profile?.amount > 0) {
                    return {
                        success: true,
                        data: {
                            cnt: profile.amount,
                        },
                    };
                }
            }
            return {
                success: false,
                data: resp?.data,
            };
        });
};

export const userAmountFeedback = async (option) => {
    const {
        uid,
        token,
        action, // increment
        count,
    } = option || {};
    console.log('user amount update - ', uid, token, action, count);
    const sdkHost = `${DomainHost}/api/sdk/customer/amount`;
    return fetch(sdkHost, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            uid,
            action,
            count,
        }),
    }).then(resp => resp.json());
};

export default {
    checkLimit,
    userAmountFeedback,
};
