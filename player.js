const SpotifyWebApi = require('spotify-web-api-node');
var express = require('express');
const DB = require('./db-utils');

var url = require('url');

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

    }

    _prepareRequest(req, res){

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
        console.log("creating room");
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
            info.master_token = "CENSORED BY SOPA";
            info.playlist_id = "Sometimes, you just need to cry.";
            this.end(JSON.stringify(info));
        });
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
