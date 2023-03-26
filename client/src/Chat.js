import React, { useEffect, useState, useRef } from 'react';
import { Toast, Button, Modal, TextArea, SafeArea, NoticeBar, Tag } from 'antd-mobile'
import { PlayOutline, HeartOutline } from 'antd-mobile-icons'
import { callBridge } from './ChatServiceBridge';
import Messages from './Messages';
import { useLocalStorage } from './utils';
import ShareLogo from './share.js'
import './Chat.css';
import PromotSelect from './PromptElement.js';

function ChatComponent(props) {
    const [userInfo, setUserInfo] = useState()
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

    const answerTSRef = useRef();
    answerTSRef.current = answerTS;

    const answerRef = useRef();
    answerRef.current = answer;

    const abortSignalRef = useRef();
    abortSignalRef.current = abortSignal;

    const messagesEndRef = useRef(null)

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

    const onopen = () => {
        console.log('opened');
        setAnswerTS(new Date().valueOf());
    }

    const onclose = () => {
        console.log('closed ', answerRef.current)
        if (answerRef.current) {
            setRetMsgs([...retMsgs, { id: genRandomMsgId(), msg: answerRef.current, timestamp: answerTSRef.current }])
            setAnswer('')
            setTyping(false);
            // setAnswerTS(new Date().valueOf());
        }
    }
    const onerror = (message) => {
        console.log("error: ", answerRef.current);
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

        setQuestion('');
        setOutMsgs([...outMsgs, { id: genRandomMsgId(), msg: question, timestamp: new Date().valueOf() }])
        if (typeof cnt === 'number') {
            setUserInfo(userInfo)
        }

        setAbortSignal(null);
        setTyping(true);
        // 向云服务发起调用
        try {
            const callRes = await callBridge({
                data: {
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
    const startCollect = (e) => {
        e.preventDefault();
        Toast.show({
            content: 'Coming Soon'
        })
    }

    const startShare = (e) => {
        e.preventDefault();
        console.log('share ....')
        Toast.show({
            content: 'Coming Soon'
        })
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
        scrollToBottom()
    }, [retMsgs, outMsgs]);

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
            <div className="top-bar">
            <div className="avatar">
                <p>W</p>
            </div>
            <div className="name">WebInfra</div>
            <div className="menu">
                <HeartOutline onClick={startCollect} />
                <ShareLogo onClick={startShare} />
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
                        userInfo={userInfo}
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