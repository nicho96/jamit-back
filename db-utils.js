const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./jamit.db', sqlite3.OPEN_READWRITE, (err) => {
    if(err){
        console.log(err.message);
    } else {
        console.log('Connected to SQLite Database.');
    }
});

const channel_get_userid = "SELECT  * FROM channels WHERE user_id = ?";
const channel_get_channelid = "SELECT * FROM channels WHERE channel_id = ?";
const channel_create = "INSERT INTO channels (user_id, playlist_id, name, master_token) VALUES (?, ?, ?, ?)";
const channel_list = "SELECT user_id, channel_id, name FROM channels";
const channel_token_update = "UPDATE channels SET master_token = ? WHERE user_id = ?";

module.exports = {

    getChannelInfoByUserId(id, callback){
        db.all(channel_get_userid, [id], function(err, rows) {
            if(rows.length != 0){
                callback(rows[0]);
            }else{
                callback(null);
            }
        });
    },

    getChannelInfoByChannelId(id, callback){
        db.all(channel_get_channelid, [id], function(err, rows) {
            if(err){
                console.log(err);
            }else{
                if(rows.length != 0){
                    callback(rows[0]);
                }else{
                    callback(null);
                }
            }
        });
    },


    createChannel(user_id, playlist_id, name, token){
        db.all(channel_create, [user_id, playlist_id, name, token], function(err, rows) {
            if(err){
                console.log(err);
            }
        });
    },

    getChannelList(callback){
        db.all(channel_list, [], function(err, rows){
            if(err){
                console.log(err);
            }else{
                callback(rows);
            }
        });
    },

    updateChannelTokenByUserId(user_id, token){
        db.run(channel_token_update, [token, user_id], function(err, rows){
            if(err){
                console.log(err);
            }
        });
    }

}
