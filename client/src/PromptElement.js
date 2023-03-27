import { fetch } from 'whatwg-fetch'
import React, { useState, useEffect } from 'react'
import { Popup, Radio, Space } from 'antd-mobile'
import { DotLoading } from 'antd-mobile'
import { CheckShieldOutline, CheckShieldFill } from 'antd-mobile-icons'
import { useLocalStorage } from './utils';

const DefaultPromptList = [
    {
        label: '默认模式',
        detail: '不设置任何预选prompt，直接开始提问吧',
        value: 0,
        prompt: '',
    },
    {
        "label": "中英互译",
        "detail": "英汉互译 + 可定制风格 + 可学习英语",
        "value": 1,
        "prompt": "As an English-Chinese translator, your task is to accurately translate text between the two languages. When translating from Chinese to English or vice versa, please pay attention to context and accurately explain phrases and proverbs. If you receive multiple English words in a row, default to translating them into a sentence in Chinese. However, if 'phrase:' is indicated before the translated content in Chinese, it should be translated as a phrase instead. Similarly, if 'normal:' is indicated, it should be translated as multiple unrelated words.Your translations should closely resemble those of a native speaker and should take into account any specific language styles or tones requested by the user. Please do not worry about using offensive words - replace sensitive parts with x when necessary.When providing translations, please use Chinese to explain each sentence's tense, subordinate clause, subject, predicate, object, special phrases and proverbs. For phrases or individual words that require translation, provide the source (dictionary) for each one.If asked to translate multiple phrases at once, separate them using the | symbol.Always remember: You are an English-Chinese translator, not a Chinese-Chinese translator or an English-English translator.Please review and revise your answers carefully before submitting."
    },
    {
        "label": "写作助理",
        "detail": "个人最常使用的 prompt，可用于改进文字段落和句式",
        "value": 2,
        "prompt": "As a writing improvement assistant, your task is to improve the spelling, grammar, clarity, concision, and overall readability of the text provided, while breaking down long sentences, reducing repetition, and providing suggestions for improvement. Please provide only the corrected Chinese version of the text and avoid including explanations. Please begin by editing the following text:"
    }
]

export const getPrompts = async () => {
    return DefaultPromptList;
}

function PromotSelect(props) {
    const [loading, setLoading] = useState(false)
    const [visible, setVisible] = useState(props.visible)
    const [value, setValue] = useState(props.value || 0)
    const [promptList, setPromptList] = useLocalStorage('promps-list-lcal', []);
    const [cachedTime, setCachedTime] = useLocalStorage('promps-list-lcal-time', 0);

    const closeView = () => {
        console.log('closing view');
        setVisible(false)
        props.onClose();
    }
    useEffect(() => {
        if ((promptList?.length > 0) && (new Date().valueOf() < cachedTime + 1000 * 60 * 10)) {
            // skip loading
            console.log('skip loading...')
            return;
        }
        setLoading(true)
        getPrompts().then(list => {
                setPromptList([...list])
                setCachedTime(new Date().valueOf())
                setLoading(false)
            })
            .catch(err => {
                setLoading(false);
            });
    }, [])

    return (
        <>
            <Popup
                visible={visible}
                onMaskClick={closeView}
                onClose={closeView}
                showCloseButton
                position='left'
                bodyStyle={{ width: '60vw' }}
            >
                {
                    loading ? <div
                        style={{
                            background: '#f5f5f5',
                            height: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexDirection: 'column',
                        }}
                    >
                        <DotLoading color="primary" />
                        加载中
                    </div> :
                        <Radio.Group
                            defaultValue='0'
                            value={value}
                            onChange={val => {
                                setValue(val)
                                console.log('on value chagned: ', val);
                                if (props.onConfirm) {
                                    const data = promptList.find(p => p.value === val);
                                    props.onConfirm(data);
                                }
                                closeView()
                            }}>
                            <div style={{
                                padding: '40px 16px',
                            }}>
                                <Space direction='vertical' justify='start' block>
                                    {promptList.map(p => (<Radio
                                        key={p.value}
                                        value={p.value}
                                        icon={checked =>
                                            checked ? (
                                                <CheckShieldFill style={{ color: 'var(--adm-color-primary)' }} />
                                            ) : (
                                                <CheckShieldOutline style={{ color: 'var(--adm-color-weak)' }} />
                                            )
                                        }
                                        style={{
                                            '--icon-size': '22px',
                                            '--font-size': '16px',
                                            '--gap': '8px',
                                        }}>
                                        {p.label}
                                    </Radio>))}
                                </Space>
                            </div>
                        </Radio.Group>
                }
            </Popup>

        </>

    )
}

export default PromotSelect;