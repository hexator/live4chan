module.exports = {
    boards: [
        'all', 'int', 'operate', 'sp', 'tg', 'v'
    ],

    all_fields: 'chat name body convo convo_id count date trip',
    board_fields: 'chat name body convo convo_id count date trip country country_name image image_filename image_filesize image_width image_height duration thumb identifier',

    admin_pw_file: 'admin_pw.txt',
    no_limit_cookie_file: 'no_limit_cookie.txt',
    max_pw_attempts: 10,
    max_pw_attempts_window: 30000,
    securetrip_salt: 'AVEPwfpR4K8PXQaKa4PjXYMGktC2XY4Qt59ZnERsEt5PzAxhyL',
    salt_file: 'salt.txt',

    /* User session expires every 24 hours */
    user_session_age: '24h',

    ssl: {
        ca: 'sub.class1.server.ca.pem',
        key: 'ssl.key',
        cert: 'ssl.crt'
    },

    /* Supported file types */
    image_formats: ['jpg', 'jpeg', 'png', 'gif'],
    video_formats: ['ogv', 'webm'],
    audio_formats: ['ogg'],

    codec_names: {
        video: ['theora', 'vp8', 'vp9'],
        audio: ['vorbis', 'libopus']
    }
};
