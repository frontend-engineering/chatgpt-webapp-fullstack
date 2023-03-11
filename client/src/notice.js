import { fetch } from 'whatwg-fetch'
import { HOST_URL } from './config'

export const getNotice = async () => {
    return fetch(`${HOST_URL}/notice.json`)
    .then(resp => resp.json())
    .then(resp => {
        console.log('resp: ', resp);
        return resp?.contents;
    })
    .catch(err => {
        console.error('getting notice failed: ', err);
        return '因多条线路被封，可能消息响应速度较慢，请耐心等待'
    })
}
