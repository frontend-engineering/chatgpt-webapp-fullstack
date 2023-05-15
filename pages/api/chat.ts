import { getContext, getClient, filterClientOptions, checkLimit, userAmountFeedback } from '../../utils/ChatServiceBridge';

// if (!process.env.OPENAI_API_KEY) {
//   throw new Error("Missing env var from OpenAI");
// }

export const config = {
  runtime: "edge",
};

const handler = async (req: Request): Promise<Response> => {
  console.log('edge function got: ', req);

  const body = ((await req.json()) || {})

  if (!body.message) {
    return new Response("No prompt in the request", { status: 400 });
  }
  const { uid, at } = body;
  let isCharged = false; // 是否消耗付费额度
  try {
      const enableAuth = process.env.NEXT_PUBLIC_ENABLE_AUTH;
      console.log('enable auth: ', enableAuth);
      if (enableAuth === 'WebInfra') {
          if (!uid) {
              throw new Error('no uid found');
          }
          const result = await checkLimit({
              uid,
              token: at,
          })
            .catch((err) => {
              console.log('check limit exception: ', err);
              throw err;
            });
          console.log('apply result: ', JSON.stringify(result));

          if (!result.success) {
              throw new Error('Auth Failed' + result?.message)
          }
          isCharged = result.data?.charged;
          console.log('Auth passed: ', isCharged);
      } else {
          console.log('Skip auth....');
      }
  } catch (error: any) {
      const obj = {
        success: false,
        message: error?.message || '数据库查询失败',
        code: error?.code || 500,
      };
      const blob = new Blob([JSON.stringify(obj, null, 2)], {
        type: "application/json",
      });
      return new Response(blob, { status: 401, statusText: "Unauthorized" });
  }

  let client;
  const clientOptions = await filterClientOptions(body.clientOptions);
  if (clientOptions && clientOptions.clientToUse) {
      client = clientOptions.clientToUse;
      delete clientOptions.clientToUse;
  }

  const targetClient = await getClient(client);
  const stream = await targetClient.sendMessage(body.message, {
      jailbreakConversationId: body.jailbreakConversationId ? body.jailbreakConversationId.toString() : undefined,
      conversationId: body.conversationId ? body.conversationId.toString() : undefined,
      parentMessageId: body.parentMessageId ? body.parentMessageId.toString() : undefined,
      conversationSignature: body.conversationSignature,
      clientId: body.clientId,
      invocationId: body.invocationId,
      clientOptions,
      // onProgress,
      onEnd: () => {
        // only update user account after request success
        userAmountFeedback({
          uid,
          token: at,
          charged: isCharged,
        }).then((amountUpdated) => {
            console.log('amount update result: ', JSON.stringify(amountUpdated));
        }).catch(err => {
          console.error('amount update failed: ', err);
        })
      },
      // abortController,
  });

  // const stream = await OpenAIStream(payload);
  return new Response(stream);
};

export default handler;
