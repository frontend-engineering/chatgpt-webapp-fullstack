import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavBar, List, Avatar, Toast } from 'antd-mobile';
import Cashier from '@cashier/web';
import { useRouter } from 'next/router';
import { appId, appToken, enableAuth } from '../components/Config.js';
import './account.module.css';

const Account = () => {
    const router = useRouter();
    const [loginState, setLoginState] = useState(null)
    const sdkInsta = useMemo(() => {
        if (!enableAuth) {
            console.log('skip auth');
            return null;
        }
        return new Cashier({
            // 应用 ID
            appId,
            appToken,
            // domain: 'https://test-sdk-api.my.webinfra.cloud'
            // domain: 'http://localhost:3333',
            pageDomain: 'https://pay.freecharger.cn',
            mobile: true,
            inPage: true,
            root: '#sdk-root'
        });
    }, []);

    /**
     * 获取用户的登录状态
     */
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

    const goPurchase = useCallback(async () => {
        if (!enableAuth) {
            console.log('skip auth');
            Toast.show({
                content: '用户功能模块已禁用',
            })
            return null;
        }
        if (!sdkInsta) return;
        const resp = await sdkInsta.purchase({})
        console.log('purchase resp: ', resp);
        getLoginState();
    }, [sdkInsta]);

    const back = () => {
        router.push('/');
    }

    const handleHelpClick = (e) => {
        e.preventDefault();
        Toast.show({
            content: '微信公众号 (webinfra) 中，发送消息联系客服',
        })
    }

    const clearUserAuth = (e) => {
        e.preventDefault();
        sdkInsta.logout().then(() => {
            Toast.show({ content: '清除登录信息' })
            window?.location?.reload();
        })
    }

    const fetchUserAuth = (e) => {
        e.preventDefault();
        if (!enableAuth) {
            console.log('skip auth');
            Toast.show({
                content: '用户功能模块已禁用',
            })
            return null;
        }
        getLoginState()
        return;
    }

    useEffect(() => {
        if (sdkInsta) {
            sdkInsta.init()
                .then(() => {
                    return getLoginState()
                })
        }
    }, [sdkInsta, getLoginState])

    return <div className='account-container'>
        <NavBar onBack={back}>账户中心</NavBar>
        <div id='sdk-root'></div>
        <List header='用户信息' mode='card'>
            <List.Item
                prefix={<Avatar src={loginState?.avatar || loginState?.weixinProfile?.headimgurl} />}
                description={loginState?.profile?.amount > 0 ? (loginState?.profile?.expireAt ? '额度有效期至 ' + new Date(loginState?.profile.expireAt).toLocaleDateString() : '') : '免费额度用完为止，不会自动刷新'}
            >
                {loginState ? (loginState.weixinProfile?.nickname || loginState?.name || loginState?.email || loginState?.id).slice(0, 13) : '未登录'}
            </List.Item>
            <List.Item extra={loginState?.profile?.expireAt ? (new Date(loginState?.profile?.expireAt).valueOf() > Date.now() ? (loginState?.profile?.amount > 0 ? loginState?.profile?.amount : 0) : '-') : (loginState?.profile?.amount > 0 ? loginState?.profile?.amount : 0)}>
                当前额度
            </List.Item>
            <List.Item onClick={goPurchase}>
                额度充值
            </List.Item>
            <List.Item onClick={handleHelpClick}>联系客服</List.Item>
            <List.Item onClick={loginState ? clearUserAuth : fetchUserAuth}>
                {(!loginState ? '点击登录' : "退出登录")}
            </List.Item>
        </List>
    </div>
}

export default Account;