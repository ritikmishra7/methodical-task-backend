const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: "users",
			index: true
		},
		type: {
			type: String,
			enum: ["USER", "PROJECT"],
			required: true
		},
		project: {
			type: Schema.Types.ObjectId,
			ref: "projects",
			index: true
		},
		payload: {
		},
		is_read: {
			type: Map,
			of: Boolean,
			default: {}
		}
	},
	{
		timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
	}
);

module.exports = mongoose.model('notifications', NotificationSchema);
