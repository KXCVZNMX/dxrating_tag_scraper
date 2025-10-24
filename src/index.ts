import dotenv from 'dotenv';
import {MongoClient} from 'mongodb'
import {SongWTags, TagBunch} from "./types";

dotenv.config({path: "./.env"});

const getTags = async () => {
    const url = "https://derrakuma.dxrating.net/functions/v1/combined-tags";

    const headers = {
        "Host": "derrakuma.dxrating.net",
        "Sec-Ch-Ua-Platform": "\"macOS\"",
        "Authorization": `Bearer ${process.env.API_KEY ?? ""}`,
        "Accept-Language": "en-GB,en;q=0.9",
        "Sec-Ch-Ua": "\"Not=A?Brand\";v=\"24\", \"Chromium\";v=\"140\"",
        "Sec-Ch-Ua-Mobile": "?0",
        "X-Client-Info": "supabase-js-web/2.49.1",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "Apikey": process.env.API_KEY ?? "",
        "Accept": "*/*",
        "Origin": "https://dxrating.net",
        "Sec-Fetch-Site": "same-site",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
        "Referer": "https://dxrating.net/"
    };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers,
            body: ""
        });

        if (!res.ok) {
            throw new Error("Could not get tags: " + res.statusText);
        }

        const data: TagBunch = await res.json();
        return data;
    } catch (e) {
        console.error(e);
        return null;
    }
}

const processTags = (tags: TagBunch) => {
    const map = new Map<string, number[]>();

    tags.tagSongs.forEach(t => {
        const key = JSON.stringify({
            songName: t.song_id,
            isDX: t.sheet_type === "dx",
            sheetDifficulty: t.sheet_difficulty,
        });

        const existing = map.get(key) || [];
        existing.push(t.tag_id);
        map.set(key, existing);
    });

    let ret: SongWTags[] = [];
    map.forEach((v, k) => {
        const obj: {songName: string, isDX: boolean, sheetDifficulty: string} = JSON.parse(k);
        ret.push({
            songName: obj.songName,
            isDX: obj.isDX,
            sheetDifficulty: obj.sheetDifficulty,
            tags: v,
        })
    })

    return ret;
};

(async () => {
    const tags = await getTags() || { tagSongs: [] };
    const processedTags = processTags(tags);
    console.log(processedTags);

    const uri = process.env.MONGODB_URI || "";
    let client: MongoClient | undefined;

    try {
        client = new MongoClient(uri);
        await client.connect();
        const db = client.db("SongTag");
        const collection = db.collection("tags");
        await collection.drop().catch(() => {});
        await collection.insertMany(processedTags);
    } catch (e) {
        console.error(e);
    } finally {
        if (client) {
            await client.close();
        }
    }
})();