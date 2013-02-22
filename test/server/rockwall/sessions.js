"use strict";

/**
 * Sessions Management.
 *
 * Note that a session object will always exist,
 * even if the user has no session.
 * This is to avoid null checks.
 *
 * The way you tell if it exists or not,
 * is by placing things to be stored there.
 */
exports.Sessions = (function() {
    var crypto = require('crypto');

    /**
     * A static salt, which will rarely change.
     */
    var SALT = 'slkdf980uf03-789bklfjklgfhory2v298l';

    /**
     * Current date with a psudo-random number added on top.
     *
     * This will be initialized every time the server starts up.
     */
    var RANDOM_SALT = Date.now() + (Math.random() * 1000000000000);

    /**
     * Name of the session cookie.
     */
    var SID_STRING = 'SESSIONID';

    /**
     * Default timeout, 9 hours, in milliseconds.
     */
    var TIMEOUT = 9*60*60*1000;

    var newSID = function( req ) {
        var md5sum = crypto.createHash('md5');

        md5sum.update(
                RANDOM_SALT + SALT + req.socket.remoteAddress + "" + Date.now(),
                'ascii'
        );
        return md5sum.digest('base64');
    }

    /**
     * The sessions manager constructor.
     */
    var Sessions = function( timeout ) {
        if ( arguments.length === 0 ) {
            timeout = TIMEOUT;
        }

        this.timeout = timeout;

        this.sessions = {};
        this.timeouts = {};
    }

    Sessions.prototype = {
        /**
         * Starts a new session.
         *
         * Note that this is called for you,
         * if you call 'setSession'.
         */
        session: function( req, res, timeout ) {
            if ( arguments.length < 3 ) {
                timeout = this.timeout;
            }
            var sessions = this.sessions,
                timeouts = this.timeouts;

            var expire = Date.now() + timeout,
                sid = req.cookies[SID_STRING];
            var sessionObj;

            /*
             * No session on client,
             * or no session on server.
             */
            if (
                               sid  === undefined ||
                      sessions[sid] === undefined ||
                    ! sessions.hasOwnProperty(sid)
            ) {
                sid = newSID( req )
                sessionObj = sessions[ sid ] = {}
            /*
             * Session found, but expired.
             */
            } else if ( timeouts.hasOwnProperty(sid) && timeouts[sid] < Date.now() ) {
                delete sessions[sid]
                delete timeouts[sid]

                sid = newSID( req )
                sessionObj = sessions[ sid ] = {}

            /*
             * Success!
             *
             * Renew the session.
             */
            } else {
                sessionObj = sessions[sid]
            }

            timeouts[sid] = expire
            req.cookies[SID_STRING] = sid;
            res.cookie( SID_STRING, sid, expire );

            return sessionObj;
        },

        /**
         * Ends the current session.
         */
        end: function( res ) {
            delete this.sessions[ res.cookies[SID_STRING] ];

            if ( res ) {
                res.cookie( 'deleted', 0 );
            }

            return this;
        },

        /**
         * @return This Sessions manager object.
         */
        setSession: function(req, res, key, val) {
            if ( arguments.length < 2 ) {
                throw new Error("not enough parameters given");
            }

            var sessionObj = this.start( req, res );

            if ( arguments.length === 2 ) {
                return new SessionsObj( req, res, sessionObj );
            } else {
                if ( sessionObj ) {
                    if ( arguments.length === 3 ) {
                        if ( typeof key === 'string' ) {
                            return sessionObj[key];
                        } else {
                            for ( var k in key ) {
                                if ( key.hasOwnProperty(k) ) {
                                    sessionObj[k] = key[k];
                                }
                            }
                        }
                    } else {
                        sessionObj[k] = key[k];
                    }
                }

                return this;
            }
        },

        getSession: function( req, key ) {
            if ( arguments.length === 0 ) {
                throw new Error("no request object given");
            }

            if ( req.cookies === undefined || req.cookies[SID_STRING] === undefined ) {
                return undefined;
            } else {
                var sid = req.cookies[ SID_STRING ];
                var session = this.sessions[sid];

                if ( session === undefined ) {
                    return session[key];
                } else {
                    return undefined;
                }
            }
        }
    }

    return Sessions;
})();
