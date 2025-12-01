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
            callbackURL: `${process.env.BASE_URL}/users/google/callback`
        },
        async (accessToken, refreshToken, profile, done) => {
            return done(null, {
                    googleId: profile.id,
                    name: profile.displayName,
                    lastName: profile.name.familyName,
                    email: profile.emails[0].value,
                });
            // const user = await User.findOne({ googleId: profile.id });
            // if (user) {
            //     return done(null, user);
            // } else {
            //     return done(null, {
            //         isNewUser: true,
            //         googleId: profile.id,
            //         name: profile.displayName,
            //         lastName: profile.name.familyName,
            //         email: profile.emails[0].value,
            //     });
            // }
        }
    )
);