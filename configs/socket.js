const { Server } = require("socket.io");
const { validate } = require('@configs/jwt');
const Project = require("@models/project");
const { v4: uuidv4 } = require('uuid');
const { receive_code_changed_event, send_code_changed_event, receive_cursor_position_changed_event, send_cursor_position_changed_event, recieve_mouse_move_event, send_mouse_move_event, receive_mouse_leave_event, send_mouse_leave_event, receive_mouse_enter_event, send_mouse_enter_event, user_joined_event, user_left_event } = require("../helpers/socket.events");

let io;
let socketObject = {};
let collabObject = {};

function createSocket(server)
{

	io = new Server(server,
		{
			cors: {
				origin: process.env.CORS_ORIGIN,
				methods: "*",
			}
		}
	);

	io.use((socket, next) => 
	{
		try
		{
			const accessToken = socket.handshake.auth.token;
			const decoded = validate(accessToken);
			if (decoded)
			{
				socket.userId = decoded.user._id;
				next();
			}
		} catch (error)
		{
			next(new Error(error));
		}
	});

	io.on('connection', async (socket) =>
	{
		const userId = socket.userId;
		const socketId = socket.id;

		socketObject[userId] = socketId;
		console.table(socketObject);

		const projects = await Project.find({
			status: 'ACTIVE',
			members: {
				$elemMatch: {
					user: userId,
					status: 'JOINED'
				}
			}
		});

		projects.map(p =>
		{
			socket.join(`${p._doc._id}`);
		});

		socket.on("disconnect", () =>
		{
			delete socketObject[socket.userId];
			console.log("user removed from socket list");
		});


		//collab-events
		socket.on(receive_code_changed_event, async (data) =>
		{
			socket.to(data.collabId).emit(send_code_changed_event, data.payload);
		});

		socket.on(receive_cursor_position_changed_event, (data) =>
		{
			socket.to(data.collabId).emit(send_cursor_position_changed_event, { userId, position: data.position });
		});

		socket.on(recieve_mouse_move_event, (data) =>
		{
			socket.to(data.collabId).emit(send_mouse_move_event, { userId, position: data.position });
		});

		socket.on(receive_mouse_leave_event, (data) =>
		{
			socket.to(data.collabId).emit(send_mouse_leave_event, { userId });
		});

		socket.on(receive_mouse_enter_event, (data) =>
		{
			socket.to(data.collabId).emit(send_mouse_enter_event, { userId });
		});

	});

	io.on("error", (error) =>
	{
		console.log(error);
	});
}

function getSocket()
{
	return io;
}

function getSocketObject()
{
	return socketObject;
}

function getUserSocketInstance(userId)
{
	const socketId = socketObject[userId];
	const socket = io.sockets.sockets.get(socketId);
	return socket;
}

async function createCollabSession(user)
{
	try
	{
		const initiator = user._id;
		const collabId = uuidv4();

		const userDetails = {
			userId: user._id,
			display_name: user.display_name,
			profile_picture: user.profile_picture
		};

		const socket = getUserSocketInstance(initiator);
		socket.join(collabId);

		collabObject[collabId] = {
			initiator,
			members: [userDetails]
		};

		const response = {
			collabId,
			initiator,
			members: collabObject[collabId].members
		};
		return response;
	} catch (error)
	{
		console.log(error);
	}
}

async function joinCollabSession(collabId, user)
{
	const initiator = user._id;
	const socket = getUserSocketInstance(initiator);
	try
	{

		if (!collabObject[collabId])
		{
			return {
				success: false,
				message: "Collab session does not exist"
			};
		}

		if (collabObject[collabId].members.find(m => m.userId === initiator))
		{
			socket.join(collabId);  //in-case user refreshes the page
			return {
				success: true,
				message: "User already in collab session",
				members: collabObject[collabId].members
			};
		}

		//check if this is the initiator
		if (collabObject[collabId].initiator === initiator)
		{
			socket.join(collabId); //in-case user refreshes the page
			return {
				success: true,
				message: "User is the initiator",
				members: collabObject[collabId].members
			};
		}

		// Join the collab room

		socket.join(collabId);

		const userDetails = {
			userId: user._id,
			display_name: user.display_name,
			profile_picture: user.profile_picture
		};

		collabObject[collabId].members.push(userDetails);


		socket.to(collabId).emit(user_joined_event, userDetails);
		const response = {
			success: true,
			collabId,
			initiator,
			members: collabObject[collabId].members

		};
		return response;
	} catch (error)
	{
		console.log(error);
	}
};


async function leaveCollabSession(collabId, user)  
{
	const userId = user._id;
	try
	{
		const socket = getUserSocketInstance(userId);

		//Check if collab session exists
		if (!collabObject[collabId])
		{
			return {
				success: false,
				message: "Collab session does not exist"
			};
		}

		socket.leave(collabId);

		collabObject[collabId].members = collabObject[collabId].members.filter(m => m.userId !== userId);

		socket.to(collabId).emit(user_left_event, { userId, display_name: user.display_name, profile_picture: user.profile_picture });

		const response = {
			success: true,
			collabId,
			userId,
		};
		return response;
	} catch (error)
	{
		console.log(error);
	}
};

module.exports = {
	createSocket,
	getSocket,
	getSocketObject,
	getUserSocketInstance,
	createCollabSession,
	joinCollabSession,
	leaveCollabSession
};
