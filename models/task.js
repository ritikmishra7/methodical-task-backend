const mongoose = require("mongoose");
const { Schema } = mongoose;

const taskSchema = Schema(
	{
		type: {
			type: String,
			enum: ["MAIN_TASK", "SUB_TASK"]
		},
		project: {
			type: Schema.Types.ObjectId,
			ref: "projects"
		},
		task_key: {
			type: String,
			required: true
		},
		summary: {
			type: String,
			trim: true
		},
		description: {
			type: String,
			trim: true
		},
		priority: {
			type: String,
			enum: ["LOW", "MEDIUM", "HIGH", "URGENT"]
		},
		assignee: [
			{
				type: Schema.Types.ObjectId,
				ref: "users"
			}
		],
		reporter: {
			type: Schema.Types.ObjectId,
			ref: "users"
		},
		documents: [
			{
				name: {
					type: String
				},
				url: {
					type: String
				},
				status: {
					type: String,
					default: "done"
				}
			}
		],
		parent_task: {
			type: Schema.Types.ObjectId,
			ref: "tasks"
		},
		status: {
			type: String,
			enum: ["TO_DO", "IN_PROGRESS", "COMPLETED", "CLOSED"],
			default: "TO_DO"
		}
	},
	{
		timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
	}
);

module.exports = mongoose.model("tasks", taskSchema);
