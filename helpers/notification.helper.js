const Notification = require("@models/notification");
const { getSocket, getSocketObject, getUserSocketInstance } = require("@configs/socket");

exports.sendNotificationToUser = async ({ to, event, payload }) =>
{
	try
	{
		const Socket = getSocket();
		const socketObject = getSocketObject();

		if (socketObject[to])
		{
			Socket.to(socketObject[to]).emit(event, payload);
		}


		//DB_HIT
		await Notification.create({
			user: to,
			type: "USER",
			payload,
		});
	} catch (error)
	{
		console.log(error);
	}
};

exports.sendProjectNotification = async ({ to, event, payload, initiator }) =>
{
	try
	{
		const initiatorSocket = getUserSocketInstance(initiator);
		initiatorSocket.to(to).emit(event, payload);

		//DB_HIT
		await Notification.create({
			type: "PROJECT",
			project: to,
			payload,
		});
	} catch (error)
	{
		console.log(error);
	}
};

exports.sendPersonalChatNotification = async ({ to, payload, initiator }) => 
{
	try
	{
		const Socket = getSocket();
		const socketObject = getSocketObject();

		if (socketObject[to])
		{
			Socket.to(socketObject[to]).emit("personal-chat", payload);
		}
		console.log('event emitted');
	} catch (error)
	{
		console.log(error);
	}
};
