export interface Tags {
    song_id: string;
    sheet_type: string;
    sheet_difficulty: string;
    tag_id: number;
}

export interface TagBunch {
    tagSongs: Tags[];
}

export interface SongWTags {
    songName: string;
    isDX: boolean;
    sheetDifficulty: string;
    tags: number[];
}