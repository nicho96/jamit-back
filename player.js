const SpotifyWebApi = require('spotify-web-api-node');
var express = require('express');
const DB = require('./db-utils');

var url = require('url');

var i = 0;

class Player {

    /**
     * Create a Player instance.
     *
     * Players provide control of a master spotify instance.
     *
     * accessToken:String(Nullable)
     *  Spotify API token for a user.
     * url:String
     *  The path of the request
     * query:JSON
     *  The GET data of the request.
     */
    constructor(express){

        express.get('/play', (req, res) => {
            this._prepareRequest(req, res);
            this.play();
        });

        express.get('/pause', (req, res) => {
            this._prepareRequest(req, res);
            this.pause();
        });

        express.get('/skip', (req, res) => {
            this._prepareRequest(req, res);
            this.skip();
        });

        express.get('/create', (req, res) => {
            this._prepareRequest(req, res);
            this._createRoom();
        });

        express.get('/add', (req, res) => {
            this._prepareRequest(req, res);
            this._addTrackToPlaylist()
        });

        express.get('/list/channels', (req, res) => {
            this._prepareRequest(req, res);
            this._listChannels();
        });

        express.get('/start', (req, res) => {
            this._prepareRequest(req, res);
            this.start();
        });

        express.get('/update', (req, res) => {
            this._prepareRequest(req, res);
            this._updateChannelAccessToken();
        })

        express.get('/channelinfo', (req, res) => {
            this._prepareRequest(req, res);
            this.channelInfo();
        })

        express.get('/playlist', (req, res) => {
            this._prepareRequest(req, res);
            this.playlist();
        })

        express.get('/current', (req, res) => {
            this._prepareRequest(req, res);
            this.current();
        })

        express.get('/purge', (req, res) => {
            this._prepareRequest(req, res);
            this._purge();
        })

    }

    _prepareRequest(req, res){

        i = i + 1;
        console.log("CONNECTION " + req.path + " " + JSON.stringify(req.query) + " " + req.connection.remoteAddress);
        this.res = res;
        this.query = req.query;
        this.accessToken = req.query.token;
        this.message = '';

        this.spotifyApi = new SpotifyWebApi({
            clientId : 'f7930380ac104aa28bff7f57b4c6dade',
            clientSecret : 'bbe37b3f4a794995bb0d82b4cd7e661b',
        });
        this.spotifyApi.setAccessToken(this.accessToken);
    }

    /*
     * Handles creating a room.
     * The room will only be created if the user doesn't already have a room.
     * This is to prevent too many playlists from being created.
     *
     * query:JSON
     *  Request GET data.
     */
    _createRoom(){
	    let token = this.accessToken;
        this.spotifyApi.getMe((err, data)=>{
            if(!err){
                let user_id = data.body.id;
                DB.getChannelInfoByUserId(user_id, (channel_id) => {
                    if(!channel_id){
                        let name = "JamIt";
                        this.spotifyApi.createPlaylist(data.body.id, 'JamIt', {'public':false}, (err, data) => {
                            if(!err){
                                let playlist_id = data.body.id;
                                DB.createChannel(user_id, playlist_id, name, token);
                            }else{
                                console.log(err);
                            }
                            this.end();
                        });
                    }
                });
            }else{
                this.end();
            }
        });
    }

    /*
     * Handles updating the master token of a
     * channel based around the userid.
     *
     * query:JSON
     *  Request GET data.
     */
    _updateChannelAccessToken(){
        let token = this.accessToken;
        this.spotifyApi.getMe((err, data)=>{
            if(!err){
                let user_id = data.body.id;
                DB.updateChannelTokenByUserId(user_id, token);
            }else{
                console.log(err);
            }
            this.end();
        });
    }


    /*
     * Handles adding a track to a playlist (by channel_id).
     * The track is added to the end of the playlist.
     *
     * query:JSON
     *  Request GET data.
     */
    _addTrackToPlaylist(){
        let channel_id = this.query.channel_id;
        let track = this.query.track;

        DB.getChannelInfoByChannelId(channel_id, (info) => {
            if(info){
                let user_id = info.user_id;
                let playlist_id = info.playlist_id;
                let token = info.master_token;
                this.spotifyApi.setAccessToken(token);
                this.spotifyApi.addTracksToPlaylist(user_id, playlist_id, [track], {}, (err, data) => {
                    if(err){
                        console.log(err);
                    }
                    this.end();
                });
            }else{
                console.log("Error loading channel info: " + channel_id);
                this.end();
            }
        });
    }

    /*
     * Handles playing the current song.
     */
    play(){
        let channel_id = this.query.channel_id;
        DB.getChannelInfoByChannelId(channel_id, (info) => {
            if(info){
                let user_id = info.user_id;
                let playlist_id = info.playlist_id;
                let token = info.master_token;
                this.spotifyApi.setAccessToken(token);
                this.spotifyApi.play();
                DB.updatePlaybackState(channel_id, true);
                this.end();
            }else{
                console.log("Error loading channel info: " + channel_id);
                this.end();
            }
        });
    }

    /*
     * Handles pausing playback.
     */
    pause(){
        let channel_id = this.query.channel_id;
        DB.getChannelInfoByChannelId(channel_id, (info) => {
            if(info){
                let user_id = info.user_id;
                let playlist_id = info.playlist_id;
                let token = info.master_token;
                this.spotifyApi.setAccessToken(token);
                this.spotifyApi.pause();
                DB.updatePlaybackState(channel_id, false);
                this.end();
            }else{
                console.log("Error loading channel info: " + channel_id);
                this.end();
            }
        });
    }

    /*
     * Handles skipping the song.
     */
    skip(){
        let channel_id = this.query.channel_id;
        DB.getChannelInfoByChannelId(channel_id, (info) => {
            if(info){
                let user_id = info.user_id;
                let playlist_id = info.playlist_id;
                let token = info.master_token;
                this.spotifyApi.setAccessToken(token);
                this.spotifyApi.skipToNext();
                this.end();
            }else{
                console.log("Error loading channel info: " + channel_id);
                this.end();
            }
        });
    }

    /*
     * Starts playback for the specified queue.
     *
     * TODO - We need to set the current playlist, and ensure it's not on shuffle.
     */
    start(){
        let channel_id = this.query.channel_id;
        DB.getChannelInfoByChannelId(channel_id, (info) => {
            if(info){
                let user_id = info.user_id;
                let playlist_id = info.playlist_id;
                let token = info.master_token;
                this.spotifyApi.setAccessToken(token);
                this.spotifyApi.pause(() => {
                    this.spotifyApi.play();
                    DB.updatePlaybackState(channel_id, true);
                    this.end();
                });
            }else{
                console.log("Error loading channel info: " + channel_id);
                this.end();
            }
        });
    }


    /*
     * Get channel info.
     */
    channelInfo(){
        let channel_id = this.query.channel_id;
        DB.getChannelInfoByChannelId(channel_id, (info) => {
            if (info) {
                info.master_token = "CENSORED BY SOPA";
                info.playlist_id = "Sometimes, you just need to cry.";
                this.end(JSON.stringify(info));
            } else {
                console.log("Failed to load info for channel " + channel_id);
                this.end("{}");
            }
        });
    }

    /*
     * Get playlist.
     */
    playlist(){
        let channel_id = this.query.channel_id;
        DB.getChannelInfoByChannelId(channel_id, (info) => {
            if (info) {
                let token = info.master_token;
                this.spotifyApi.setAccessToken(token);
                this.spotifyApi.getPlaylist(info.user_id, info.playlist_id, {}, (error, data) => {
                    if (data) {
                        this.end(JSON.stringify(data));
                    } else {
                        console.log("FUCK");
                    }
                });
            } else {
                console.log("Failed to load info for channel " + channel_id);
                this.end("{}");
            }
        });
    }

    /*
     * Get current track.
     */
    current(){
        let channel_id = this.query.channel_id;
        DB.getChannelInfoByChannelId(channel_id, (info) => {
            if (info) {
                let token = info.master_token;
                this.spotifyApi.setAccessToken(token);
                this.spotifyApi.getMyCurrentPlayingTrack({}, (error, data) => {
                    if (data) {
                        this.end(JSON.stringify(data));
                    } else {
                        this.end("{}");
                    }
                });
            } else {
                console.log("Failed to load info for channel " + channel_id);
                this.end("{}");
            }
        });
    }

    _purge(){
        DB.deleteChannels();
        this.end(`
            QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ
            QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ
            QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ
            QQQQQQQQQQQQQQQQQQQWQQQQQWWWBBBHHHHHHHHHBWWWQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ
            QQQQQQQQQQQQQQQD!'__ssaaaaaaaaaass_ass_s____.  -~""??9VWQQQQQQQQQQQQQQQQQQQ
            QQQQQQQQQQQQQP'_wmQQQWWBWV?GwwwmmWQmwwwwwgmZUVVHAqwaaaac,"?9$QQQQQQQQQQQQQQ
            QQQQQQQQQQQW! aQWQQQQW?qw#TTSgwawwggywawwpY?T?TYTYTXmwwgZ$ma/-?4QQQQQQQQQQQ
            QQQQQQQQQQW' jQQQQWTqwDYauT9mmwwawww?WWWWQQQQQ@TT?TVTT9HQQQQQQw,-4QQQQQQQQQ
            QQQQQQQQQQ[ jQQQQQyWVw2$wWWQQQWWQWWWW7WQQQQQQQQPWWQQQWQQw7WQQQWWc)WWQQQQQQQ
            QQQQQQQQQf jQQQQQWWmWmmQWU???????9WWQmWQQQQQQQWjWQQQQQQQWQmQQQQWL 4QQQQQQQQ
            QQQQQQQP'.yQQQQQQQQQQQP"       <wa,.!4WQQQQQQQWdWP??!"??4WWQQQWQQc ?QWQQQQQ
            QQQQQP'_a.<aamQQQW!<yF "!' ..  "??$Qa "WQQQWTVP'    "??' =QQmWWV?46/ ?QQQQQ
            QQQP'sdyWQP?!'.-"?46mQQQQQQT!mQQgaa. <wWQQWQaa _aawmWWQQQQQQQQQWP4a7g -WWQQ
            QQ[ j@mQP'adQQP4ga, -????" <jQQQQQWQQQQQQQQQWW;)WQWWWW9QQP?"'  -?QzQ7L ]QQQ
            QW jQkQ@ jWQQD'-?$QQQQQQQQQQQQQQQQQWWQWQQQWQQQc "4QQQQa   .QP4QQQQfWkl jQQQ
            QE ]QkQk $D?'  waa "?9WWQQQP??T?47'_aamQQQQQQWWQw,-?QWWQQQQQ'"QQQD\Qf(.QWQQ
            QQ,-Qm4Q/-QmQ6 "WWQma/  "??QQQQQQL 4W"- -?$QQQQWP's,awT$QQQ@  "QW@?$:.yQQQQ
            QQm/-4wTQgQWQQ,  ?4WWk 4waac -???$waQQQQQQQQF??'<mWWWWWQW?^  ' ]6QQ' yQQQQQ
            QQQQw,-?QmWQQQQw  a,    ?QWWQQQw _.  "????9VWaamQWV???"  a j/  ]QQf jQQQQQQ
            QQQQQQw,"4QQQQQQm,-$Qa     ???4F jQQQQQwc <aaas _aaaaa 4QW ]E  )WQ'=QQQQQQQ
            QQQQQQWQ/ $QQQQQQQa ?H ]Wwa,     ???9WWWh dQWWW,=QWWU?  ?!     )WQ ]QQQQQQQ
            QQQQQQQQQc-QWQQQQQW6,  QWQWQQQk <c                             jWQ ]QQQQQQQ
            QQQQQQQQQQ,"$WQQWQQQQg,."?QQQQ'.mQQQmaa,.,                . .; QWQ.]QQQQQQQ
            QQQQQQQQQWQa ?$WQQWQQQQQa,."?( mQQQQQQW[:QQQQm[ ammF jy! j( } jQQQ(:QQQQQQQ
            QQQQQQQQQQWWma "9gw?9gdB?QQwa, -??T$WQQ;:QQQWQ ]WWD _Qf +?! _jQQQWf QQQQQQQ
            QQQQQQQQQQQQQQQws "Tqau?9maZ?WQmaas,,    --~-- ---  . _ssawmQQQQQQk 3QQQQWQ
            QQQQQQQQQQQQQQQQWQga,-?9mwad?1wdT9WQQQQQWVVTTYY?YTVWQQQQWWD5mQQPQQQ ]QQQQQQ
            QQQQQQQWQQQQQQQQQQQWQQwa,-??$QwadV}<wBHHVHWWBHHUWWBVTTTV5awBQQD6QQQ ]QQQQQQ
            QQQQQQQQQQQQQQQQQQQQQQWWQQga,-"9$WQQmmwwmBUUHTTVWBWQQQQWVT?96aQWQQQ ]QQQQQQ
            QQQQQQQQQQWQQQQWQQQQQQQQQQQWQQma,-?9$QQWWQQQQQQQWmQmmmmmQWQQQQWQQW(.yQQQQQW
            QQQQQQQQQQQQQWQQQQQQWQQQQQQQQQQQQQga%,.  -??9$QQQQQQQQQQQWQQWQQV? sWQQQQQQQ
            QQQQQQQQQWQQQQQQQQQQQQQQWQQQQQQQQQQQWQQQQmywaa,;~^"!???????!^'_saQWWQQQQQQQ
            QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQWWWWQQQQQmwywwwwwwmQQWQQQQQQQQQQQ
            QQQQQQQWQQQWQQQQQQWQQQWQQQQQWQQQQQQQQQQQQQQQQWQQQQQWQQQWWWQQQQQQQQQQQQQQQWQ
            `);
    }

    _listChannels(){
        DB.getChannelList((list) => {
            this.end(JSON.stringify(list));
        });
    }

    _done(message = ''){
        this.res.end(message);
    }

    end(message){
        this.res.end(message);
    }

}

module.exports = Player;
