const { Server } = require("socket.io");
const { validate } = require('@configs/jwt');
const Project = require("@models/project");

let io;
let socketObject = {};

function createSocket(server)
{

	io = new Server(server,
		{
			cors: {
				origin: 'http://localhost:3000',
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

module.exports = {
	createSocket,
	getSocket,
	getSocketObject,
	getUserSocketInstance
};
