import React, { useState } from 'react'
import { SafeArea, Form, Input, Button, TextArea, NavBar, Toast, ActionSheet } from 'antd-mobile'
import { useLocalStorage } from './utils'
import './CreatePrompt.css'
import { useNavigate, useParams, useLocation } from 'react-router-dom'

function AddPrompt(props) {
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const { value } = useParams()
    const [visibleDelete, setVisibleDelete] = useState(false)
    const [defaultPromptList] = useLocalStorage('promps-list-lcal', []);
    const [promptList, setPromptList] = useLocalStorage('custom-promps-list-lcal', [])
    const [cachedTime, setCachedTime] = useLocalStorage('custom-promps-list-lcal-time', 0)
    const [selectedPrompt, setSelectedPrompt] = useLocalStorage('chat-selected-prompt', null);
    const editingPrompt = promptList.find((prompt) => prompt.value.toString() === value)
    const [form] = Form.useForm()

    const actions = [
        {
            text: '确认',
            key: 'delete',
            bold: true,
            onClick: () => onRemovePrompt()
        }
    ]

    const onAddPrompt = () => {
        if (form.getFieldValue('label') && form.getFieldValue('prompt')) {
            const newPrompt = form.getFieldsValue()
            newPrompt['value'] = `${newPrompt.label}${promptList.length}`
            setPromptList(promptList.concat([newPrompt]))
            setCachedTime(new Date().valueOf())
            setSelectedPrompt(newPrompt)
            Toast.show({
                icon: 'success',
                content: `新增场景成功`,
            })
            setTimeout(() => {
                navigate('/build')
            }, 2000)
        }
    }

    const onRemovePrompt = () => {
        setPromptList(promptList.filter((prompt) => prompt.value !== editingPrompt.value))
        setCachedTime(new Date().valueOf())
        if (editingPrompt.value === selectedPrompt.value) {
            setSelectedPrompt(defaultPromptList[0])
        }
        navigate('/build')
    }

    const onEditPrompt = () => {
        const editedPromptList = promptList.map((prompt) => {
            if (prompt.value === editingPrompt.value) {
                const newPrompt = form.getFieldsValue()
                editingPrompt.label = newPrompt.label
                editingPrompt.detail = newPrompt.detail
                editingPrompt.prompt = newPrompt.prompt
            }
            return prompt
        })
        setPromptList(editedPromptList)
        setCachedTime(new Date().valueOf())
        setSelectedPrompt(editingPrompt)
        Toast.show({
            icon: 'success',
            content: `编辑场景成功`,
        })
        setTimeout(() => {
            navigate('/build')
        }, 2000)
    }

    const onSubmit = () => {
        if (pathname === '/addPrompt') {
            onAddPrompt()
        } else {
            onEditPrompt()
        }
    }

    return (
        <>
            <div className="container">
                <div style={{ background: '#ace0ff' }}>
                    <SafeArea position='top' />
                </div>
                <NavBar onBack={() => { navigate(-1) }} right={pathname !== '/addPrompt' && <div onClick={() => setVisibleDelete(true)}>删除场景</div>}>
                    {pathname === '/addPrompt' ? '新增' : '编辑'}预设场景
                </NavBar>
                <Form form={form} layout='vertical' mode='card' footer={
                    <Button className='btn' block type='submit' color='primary' size='large' onClick={onSubmit}>
                        提交
                    </Button>}
                    initialValues={pathname === '/addPrompt' ? { label: '', detail: '', prompt: '' } : { ...editingPrompt }}
                >
                    <Form.Header>预设场景</Form.Header>
                    <Form.Item name="label" label='场景名称' rules={[{ required: true, message: '场景名称不能为空' }]}>
                        <Input placeholder='请输入场景名称' maxLength={4} autoFocus />
                    </Form.Item>
                    <Form.Header />
                    <Form.Item name="detail" label='场景描述'>
                        <Input placeholder='请输入场景描述' maxLength={20} />
                    </Form.Item>
                    <Form.Header />
                    <Form.Item name="prompt" label='场景规则' rules={[{ required: true, message: '场景规则不能为空' }]}>
                        <TextArea placeholder='请输入场景规则'
                            maxLength={1000}
                            rows={15}
                            autoSize={{ minRows: 1, maxRows: 15 }}
                            showCount
                        />
                    </Form.Item>
                </Form>
            </div>
            <ActionSheet
                visible={visibleDelete}
                actions={actions}
                onClose={() => setVisibleDelete(setVisibleDelete)}
                extra={<div>删除<span style={{ color: '#79C7C5', fontSize: '15px'}}>{editingPrompt ? editingPrompt.label : ''}</span>场景</div>}
                cancelText='取消'
            />
        </>
    )
}

export default AddPrompt;