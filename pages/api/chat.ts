import { getClient, filterClientOptions } from '../../utils/ChatServiceBridge';

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
      // abortController,
  });

  // const stream = await OpenAIStream(payload);
  return new Response(stream);
};

export default handler;
