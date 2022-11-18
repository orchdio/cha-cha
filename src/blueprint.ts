export interface UrlVerificationEventResponse {
    token: string,
    challenge: string,
    type: string
}

export enum Event {
    URL_VERIFICATION = 'url_verification'
}

export interface Track {
    url: string;
    artistes: string[];
    released: Date;
    duration: string;
    explicit: boolean;
    title: string;
    preview: string;
    album: string;
    id: string;
    cover: string;
}



    export interface Platforms {
        deezer?: Track;
        spotify?: Track;
        tidal?: Track;
        ytmusic?: Track;
        applemusic?: Track;
    }

    export interface Data {
        entity: string;
        platforms: Platforms;
        short_url: string;
    }

    export interface TrackConversion {
        data: Data;
        message: string;
        status: number;
    }


