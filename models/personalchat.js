const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PersonalChatSchema = new Schema(
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
		type: {
			type: String,
			enum: ["TEXT", "IMAGE", "FILE", "VIDEO", "AUDIO"],
			default: "TEXT",
			required: true
		},
		message: {
			type: String,
			trim: true
		},
		document: [{
			name: {
				type: String
			},
			url: {
				type: String
			}
		}],
		read_by: [
			{
				type: Schema.Types.ObjectId,
				ref: "users"
			}
		],
		sent_at: {
			type: Date,
			default: Date.now
		},
		chat_id: {
			type: Schema.Types.ObjectId,
			ref: "chat_history"
		}
	},
	{
		timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
	});
module.exports = mongoose.model('personal_chat', PersonalChatSchema);
