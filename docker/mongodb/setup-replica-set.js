var config = {
    "_id": "mongodb-replica-set",
    "version": 1,
    "members": [
        {
            "_id": 0,
            "host": "127.0.0.1:27017"
        },
    ]
};
rs.initiate(config);
rs.status();
