const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatHistory = new Schema(
	{
		project: {
			type: Schema.Types.ObjectId,
			ref: "projects",
			index: true
		},
		sender: {
			type: Schema.Types.ObjectId,
			ref: "users",
			required: true
		},
		receiver: [
			{
				type: Schema.Types.ObjectId,
				ref: "users",
				required: true
			}
		],
		members: [
			{
				type: Schema.Types.ObjectId,
				ref: "users",
				required: true
			}
		],
		last_message: {
			type: Schema.Types.ObjectId,
			ref: "personal_chat",
		}
	},
	{
		timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
	});


module.exports = mongoose.model('chat_history', chatHistory);
