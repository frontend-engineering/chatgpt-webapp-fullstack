import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Toast, Button, Modal, TextArea, SafeArea, NoticeBar, Tag } from 'antd-mobile'
import { PlayOutline, UserSetOutline } from 'antd-mobile-icons'
import Cashier from '@cashier/web';
import { useNavigate } from 'react-router-dom'
import { callBridge } from './ChatServiceBridge';
import Messages from './Messages';
import { useLocalStorage } from './utils';
import './Chat.css';
import PromotSelect from './PromptElement.js';
import { appId, appToken, enableAuth } from './config.js';


function ChatComponent(props) {
    const navigate = useNavigate()
    const [loginState, setLoginState] = useState(null)
    const [question, setQuestion] = useState("");
    const [outMsgs, setOutMsgs] = useLocalStorage('chat-out-msgs', []);
    const [retMsgs, setRetMsgs] = useLocalStorage('chat-ret-msgs', []);
    const [msgId, setMsgId] = useState('');
    const [convId, setConvId] = useState('');
    const [typing, setTyping] = useState(false);
    const [answerTS, setAnswerTS] = useState(new Date().valueOf());
    const [answer, setAnswer] = useState();
    const [hasNotice, setHasNotice] = useState('');
    const [abortSignal, setAbortSignal] = useState(null);
    const [selectingPrompt, setSelectingPrompt] = useState(false);
    const [selectedPrompt, setSelectedPrompt] = useLocalStorage('chat-selected-prompt', null);

    const sdkInsta = useMemo(() => {
        if (!enableAuth) {
            console.log('skip auth');
            return null;
        }
        return new Cashier({
            // 应用 ID
            appId,
            appToken,
            root: '#sdk-root',
            // domain: 'http://localhost:3333',
            pageDomain: 'https://pay.freecharger.cn',
            mobile: true,
            inPage: true,
        });
    }, []);

    const answerTSRef = useRef();
    answerTSRef.current = answerTS;

    const answerRef = useRef();
    answerRef.current = answer;

    const abortSignalRef = useRef();
    abortSignalRef.current = abortSignal;

    const messagesEndRef = useRef(null)

    const getLoginState = useCallback(async () => {
        if (!sdkInsta) return;
        try {
            console.log('get login state...');
            let state = await sdkInsta.getUserInfo();
            console.log('get loginState resp: ', state)
            if (!state) {
                state = await sdkInsta.login()
            }
            setLoginState(state);
        } catch (error) {
            console.error('login state: ', error);
            Toast.show({
                content: `初始化失败 - ${error?.message}`
            }) 
        }
    }, [sdkInsta]);

    const getLoginTokens = useCallback(async () => {
        if (!sdkInsta) return;
        let tokens = await sdkInsta.getTokens();
        console.log('get tokens: ', tokens)
        return tokens;
    }, [sdkInsta]); 

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        console.log('scroll to bottom');
    }

    const genRandomMsgId = () => {
        return `msg-${new Date().valueOf()}-${Math.floor(Math.random() * 10)}`;
    }

    const onChoosePrompt = (val) => {
        setSelectedPrompt(val)
        Toast.show({
            content: `预设模式更新为 - ${val.label}`
        })
    }
    
    const inputQuestion = val => {
        setQuestion(val);
    }

    const onmessage = (msgObj) => {
        // { data: 'Hello', event: '', id: '', retry: undefined }
        setAnswer(lastAns => (lastAns || '') + JSON.parse(msgObj.data));
        scrollToBottom()
    }

    const onopen = async () => {
        console.log('chat on open');
        setAnswerTS(new Date().valueOf());
    }

    const onclose = () => {
        console.log('chat on close ', answerRef.current)
        if (answerRef.current) {
            setRetMsgs([...retMsgs, { id: genRandomMsgId(), msg: answerRef.current, timestamp: answerTSRef.current }])
            setAnswer('')
            setTyping(false);
            // setAnswerTS(new Date().valueOf());
        }
    }
    const onerror = (message) => {
        console.log("chat on error: ", answerRef.current);
        if (answerRef.current) {
            if (answerRef.current) {
                setRetMsgs([...retMsgs, { id: genRandomMsgId(), msg: answerRef.current + '...', timestamp: answerTSRef.current }])
            }
            setAnswer('')
            setTyping(false);
        } else {
            console.log('chatGPT error msg: ', message);
            throw new Error('ChatGPT 用量饱和，请稍后重试')
        }
    }

    const directChat = async function (e) {
        e.preventDefault();
        if (!question) {
            Toast.show({
                content: '请输入有效问题',
            })
            return;
        }

        if (!loginState && enableAuth) {
            Toast.show({
                content: '请先登录'
            })
            return;
        }

        setQuestion('');
        setOutMsgs([...outMsgs, { id: genRandomMsgId(), msg: question, timestamp: new Date().valueOf() }])

        setAbortSignal(null);
        setTyping(true);
        // 向云服务发起调用
        try {
            const tokens = await getLoginTokens();
            const callRes = await callBridge({
                data: {
                    uid: loginState?.id,
                    at: tokens?.accessToken,
                    message: question,
                    parentMessageId: msgId,
                    conversationId: convId,
                    prompt: selectedPrompt?.prompt
                },
                onmessage,
                onopen,
                onclose,
                onerror,
                getSignal: (sig) => {
                    setAbortSignal(sig);
                },
                debug: props.debug
            })
 
            console.log('client stream result: ', abortSignalRef.current, callRes);
            const { response, messageId, conversationId } = callRes || {}

            if (messageId) {
                setMsgId(messageId);
            }
            if (conversationId) {
                setConvId(conversationId);
            }

            // TODO: Persist request feedback to mysql
            setTyping(false);
            setRetMsgs([...retMsgs, { id: messageId, msg: response, timestamp: answerTSRef.current }])
            setAnswer('')

            return callRes;
        } catch (error) {
            console.error('call service error: ', error);
            setRetMsgs([...retMsgs, { id: genRandomMsgId(), msg: error?.message || '在线人数太多啦，请稍后再试', timestamp: new Date().valueOf() }])
            setTyping(false);
        }
    }

    const gotoAccount = (e) => {
        e.preventDefault();
        console.log('goto account page ....')
        navigate('/build/account');
    }

    const deleteItem = (id, type) => {
        if (!id) {
            Toast.show({
                icon: 'fail',
                content: '该对话已过期',
            })
            return;
        }
        Modal.confirm({
            content: '确认删除该对话',
            confirmText: '删除',
            cancelText: '取消',
            onCancel: () => {
                console.log('close modal')
                Modal.clear()
            },
            onConfirm: () => {
                if (type === 'incoming') {
                    setRetMsgs([...(retMsgs.filter(item => item.id !== id))])
                } else {
                    setOutMsgs([...(outMsgs.filter(item => item.id !== id))])
                }

                Modal.clear();
            }
        })
    }
    const editItem = (txt) => {
        setQuestion(txt);
    }

    useEffect(() => {
        if (sdkInsta) {
            sdkInsta.init()
                .then(() => {
                    console.log('sdk init done');
                    return getLoginState()
                })
        }
    }, [sdkInsta, getLoginState])

    useEffect(() => {
        setTimeout(() => {
            scrollToBottom();
        }, 300)
    }, []);

    const onCancelChat = (e) => {
        e.preventDefault();
        console.log('=============user===cancel============');
        abortSignalRef.current?.abort();
        // TODO: Send cancel feedback to server
        setTyping(false);
    }

    return (<div className="container">
        <div className="chatbox">
            <div id='sdk-root'></div>
            <div className="top-bar">
            <div className="avatar">
                <p>{loginState?.name?.toUpperCase().slice(0, 2) || 'W'}</p>
            </div>
            <div className="name">WebInfra</div>
            <div className="menu">
                <UserSetOutline onClick={gotoAccount} />
                {/* <svg onClick={logout} viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                    <path d="M961 511.5c0.1-7.8-2.9-15.5-8.8-21.4-1-1-2.1-1.9-3.2-2.7L810.7 349.1c-11.7-11.7-30.7-11.7-42.4 0s-11.7 30.8 0 42.4l85.6 85.5h-471c-16.5 0-30 13.5-30 30s13.5 30 30 30h479.9l-94.6 94.5c-11.7 11.7-11.7 30.8 0 42.4 11.7 11.7 30.7 11.7 42.4 0L949 535.6c1.1-0.8 2.2-1.7 3.2-2.7 5.9-5.9 8.8-13.6 8.8-21.4z" fill="#141414" p-id="2780"></path><path d="M726.6 835c-63.4 41.8-137.2 64-213.5 64-52.4 0-103.2-10.3-151-30.5-46.2-19.5-87.7-47.5-123.4-83.2C203 749.7 175 708.2 155.5 662c-20.2-47.8-30.5-98.6-30.5-151 0-52.4 10.3-103.2 30.5-151 19.5-46.2 47.5-87.7 83.2-123.3C274.3 201 315.8 173 362 153.5c47.8-20.2 98.6-30.5 151-30.5 75.7 0 151.6 21.9 213.9 61.8 14 8.9 32.5 4.9 41.4-9.1 8.9-14 4.9-32.5-9.1-41.4C687.5 88.3 600 63 513.1 63c-60.5 0-119.2 11.8-174.4 35.2-53.4 22.6-101.3 54.9-142.4 96-41.1 41.1-73.4 89-96 142.4C76.9 391.9 65 450.5 65 511s11.9 119.1 35.2 174.4c22.6 53.4 54.9 101.3 96 142.4 41.1 41.1 89.1 73.4 142.4 96C393.9 947.2 452.5 959 513 959c88.1 0 173.3-25.5 246.6-73.9 13.8-9.1 17.6-27.7 8.5-41.6-9.1-13.8-27.7-17.6-41.5-8.5z" fill="#141414" p-id="2781"></path>
                </svg> */}
            </div>
            </div>
            { hasNotice ? <div className='notice'>
                <NoticeBar content={hasNotice} color='alert' closeable onClose={() => { setHasNotice('') }} />
            </div> : null }
            <div className="middle" style={{ marginTop: hasNotice ? '85px' : '60px' }}>
                <div className="chat-container">
                    <Messages
                        retMsgs={[ ...retMsgs, answer ? { msg: answer, timestamp: answerTS } : null ].map(item => { item && (item.type = 'incoming'); return item })}
                        outMsgs={outMsgs.map(item => { item && (item.type = 'outgoing'); return item })}
                        userInfo={loginState}
                        onItemDeleted={deleteItem}
                        onEdit={editItem} />
                    <div className='chat-bottom-line' ref={messagesEndRef}></div>
                </div>
            </div>
            <div className="bottom-bar">
                <div className="prompt-container" style={{ visibility: typing ? 'hidden' : 'unset' }}>
                    <Tag className='prompt-tag' onClick={(e) => { setSelectingPrompt(!selectingPrompt); }}>{ selectedPrompt?.label || '默认模式' }</Tag>
                    { selectingPrompt ? <PromotSelect onConfirm={onChoosePrompt} value={selectedPrompt?.value} visible={selectingPrompt} onClose={() => { setSelectingPrompt(false) }} /> : null }
                </div>
                <div className="chat">
                    {/* <Input type="text" value={question} onChange={inputQuestion} onEnterPress={directChat} placeholder="开始提问吧..." enterkeyhint="done" maxLength={300} autoFocus clearable /> */}
                    <TextArea placeholder={selectedPrompt?.detail || '开始提问吧'}
                        value={question}
                        onChange={inputQuestion}
                        rows={1}
                        maxLength={300}
                        autoSize={{ minRows: 1, maxRows: 8 }} 
                        showCount
                        autoFocus />
                    {typing && <div className="cancel-container">
                            <div className='cancel' onClick={onCancelChat}>
                                <svg stroke="currentColor" fill="none" strokeWidth="1.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                                取消
                            </div>
                        </div> 
                    }
                    {typing ?
                        <div className="typing">
                            <div className="bubble">
                                <div className="ellipsis one"></div>
                                <div className="ellipsis two"></div>
                                <div className="ellipsis three"></div>
                            </div>
                        </div> :
                        <div className="button-container">
                            <Button className='button' onClick={(e) => directChat(e)}  >
                                <PlayOutline />
                            </Button>
                        </div>    
                    }
                </div>
            </div>
            <SafeArea position='bottom' />
        </div>
    </div>)
}

export default ChatComponent;