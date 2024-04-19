const Chat = require("@models/chat");
const { getSocket, getSocketObject, getUserSocketInstance } = require("@configs/socket");

exports.sendChatMessageHelper = async ({ to, event, payload, initiator, type }) => 
{
	try
	{
		const initiatorSocket = getUserSocketInstance(initiator);
		initiatorSocket.to(to).emit(event, payload);
		let response = {};
		if (type === "TEXT")
		{
			response = await Chat.create({
				project: to,
				sender: initiator,
				type,
				message: payload.message,
				read_by: [initiator],
				sent_at: payload.sent_at
			});
		}
		else
		{
			response = await Chat.create({
				project: to,
				sender: initiator,
				type,
				document: payload.document,
				read_by: [initiator],
				sent_at: payload.sent_at
			});
		}
		return response;
	} catch (error)
	{
		console.log(error);
	}
};
