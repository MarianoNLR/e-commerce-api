import { Schema, model } from "mongoose";

const sessionSchema = new Schema({
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    refreshToken: { 
        type: String, 
        required: true
    },
    userAgent: { 
        type: String 
    },
    revoked: { 
        type: Boolean, 
        default: false 
    },
    ipAddress: { 
        type: String 
    },
    expiresAt: { 
        type: Date, 
        required: true
    }
}, { timestamps: true });

// TTL index to automatically delete expired sessions
sessionSchema.index({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

const Session = model('Session', sessionSchema);

export default Session;