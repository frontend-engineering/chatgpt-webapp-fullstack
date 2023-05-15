import kv from "@vercel/kv";

const EXPIRE_TIME = 3600 * 24 * 7

class ObjCacheWrap {
    async get(key) {
        if (!key) {
            throw new Error('Get key is lost')
        }
        return kv.hgetall(key);
    }
    async set(key, value, opt) {
        if (!key) {
            throw new Error('Set key is lost')
        }
        if (typeof value !== 'object') {
            throw new Error('Set value must be an object type');
        }
        return kv.hset(key, value, opt || { ex: EXPIRE_TIME })
    }
}

export default ObjCacheWrap;