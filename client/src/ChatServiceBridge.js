// Run the server first with `npm run server`
import { fetchEventSource } from '@fortaine/fetch-event-source';
import { HOST_URL } from './config'

export const callBridge = async (options) => {
    const { data, onmessage, onopen, onclose, onerror, getSignal } = options || {}
    if (!data?.message) {
        throw new Error('Empty Input Message');
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
        await fetchEventSource(`${HOST_URL}/api/chat`, {
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
        console.log(reply);

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
