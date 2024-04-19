const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ChatSchema = new Schema(
	{
		project: {
			type: Schema.Types.ObjectId,
			ref: "projects",
			index: true
		},
		sender: {
			type: Schema.Types.ObjectId,
			ref: "users"
		},
		type: {
			type: String,
			enum: ["TEXT", "IMAGE", "FILE", "VIDEO", "AUDIO"],
			default: "TEXT"
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
		}
	},
	{
		timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
	});

ChatSchema.statics.getProjectMessages = function (project_id, limit, skip)
{
	// return this.model('chat').find({ project: project_id }).populate("sender", "display_name email profile_picture").populate("read_by", "display_name email profile_picture").sort({ created_at: -1 }).limit(limit).skip(skip);
	return this.model('chat').find({ project: project_id }).populate("sender", "display_name email profile_picture").populate("read_by", "display_name email profile_picture");
};
module.exports = mongoose.model('chat', ChatSchema);
