const { getSocket, getSocketObject, getUserSocketInstance } = require("@configs/socket");
const { v4: uuidv4 } = require('uuid');


exports.createCollabSession = async (user) => 
{
	try
	{

		const initiator = user._id;
		const socket = getUserSocketInstance(initiator);

		const collabId = uuidv4();
		socket.join(collabId);
		collabObject[collabId] = {
			initiator,
			members: [user]
		};

		const response = {
			collabId,
			initiator
		};
		return response;
	} catch (error)
	{
		console.log(error);
	}
};

exports.joinCollabSession = async (collabId, user) => 
{
	const userId = user._id;
	try
	{
		const socket = getSocket();

		//Check if collab session exists
		if (!collabObject[collabId])
		{
			return {
				success: false,
				message: "Collab session does not exist"
			};
		}

		socket.join(collabId);

		collabObject[collabId].members.push(user);

		const response = {
			success: true,
			collabId,
			userId
		};
		return response;
	} catch (error)
	{
		console.log(error);
	}
};

exports.leaveCollabSession = async (collabId, user) => 
{
	const userId = user._id;
	try
	{
		const socket = getSocket();

		//Check if collab session exists
		if (!collabObject[collabId])
		{
			return {
				success: false,
				message: "Collab session does not exist"
			};
		}

		socket.leave(collabId);

		collabObject[collabId].members = collabObject[collabId].members.filter(m => m._id !== userId);

		const response = {
			success: true,
			collabId,
			userId
		};
		return response;
	} catch (error)
	{
		console.log(error);
	}
};

exports.collabObject = collabObject;
