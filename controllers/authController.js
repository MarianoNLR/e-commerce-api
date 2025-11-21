import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:3000/users/google/callback"
        },
        async (accessToken, refreshToken, profile, done) => {
            // Here you would find or create a user in your database
            const user = await User.findOne({ googleId: profile.id });
            if (user) {
                return done(null, user);
            } else {
                return done(null, {
                    isNewUser: true,
                    googleId: profile.id,
                    name: profile.displayName,
                    lastName: profile.name.familyName,
                    email: profile.emails[0].value,
                });
            }
        }
    )
);