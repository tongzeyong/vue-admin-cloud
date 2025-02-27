<template>
  <LoginFormTitle v-show="getShow" class="enter-x" />
  <Form
    :class="`${prefixCls}-from p-4 enter-x`"
    :model="formData"
    :rules="getFormRules"
    ref="formRef"
    v-show="getShow"
    @keypress.enter="handleLogin"
  >
    <FormItem name="username" class="enter-x">
      <Input
        size="large"
        v-model:value="formData.username"
        :placeholder="t('sys.login.userName')"
        class="fix-auto-fill"
      />
    </FormItem>
    <FormItem name="password" class="enter-x">
      <InputPassword
        size="large"
        visibilityToggle
        autocomplete="off"
        v-model:value="formData.password"
        :placeholder="t('sys.login.password')"
      />
    </FormItem>
    <FormItem name="loginCode" class="enter-x">
      <Input size="large" v-model:value="formData.loginCode" autocomplete="off" placeholder="验证码" class="login-code-input">
        <template #suffix>
          <Image
            class="object-fill cursor-pointer"
            :src="formData.images"
            :preview="false"
            @click="GetCode()"
          />
        </template>
      </Input>
    </FormItem>
    <ARow class="enter-x">
      <ACol :span="12">
        <FormItem>
          <!-- No logic, you need to deal with it yourself -->
          <Checkbox v-model:checked="rememberMe" size="small">
            {{ t('sys.login.rememberMe') }}
          </Checkbox>
        </FormItem>
      </ACol>
      <ACol :span="12">
        <FormItem :style="{ 'text-align': 'right' }">
          <!-- No logic, you need to deal with it yourself -->
          <Button type="link" size="small" @click="setLoginState(LoginStateEnum.RESET_PASSWORD)">
            {{ t('sys.login.forgetPassword') }}
          </Button>
        </FormItem>
      </ACol>
    </ARow>

    <FormItem class="enter-x">
      <Button type="primary" size="large" block @click="handleLogin" :loading="loading">
        {{ t('sys.login.loginButton') }}
      </Button>
    </FormItem>
    <ARow class="enter-x" :gutter="[16, 16]">
      <ACol :md="8" :xs="24">
        <Button block @click="setLoginState(LoginStateEnum.MOBILE)">
          {{ t('sys.login.mobileSignInFormTitle') }}
        </Button>
      </ACol>
      <ACol :md="8" :xs="24">
        <Button block @click="setLoginState(LoginStateEnum.QR_CODE)">
          {{ t('sys.login.qrSignInFormTitle') }}
        </Button>
      </ACol>
      <ACol :md="8" :xs="24">
        <Button block @click="setLoginState(LoginStateEnum.REGISTER)">
          {{ t('sys.login.registerButton') }}
        </Button>
      </ACol>
    </ARow>

    <Divider class="enter-x">{{ t('sys.login.otherSignIn') }}</Divider>

    <div class="flex justify-evenly enter-x" :class="`${prefixCls}-sign-in-way`">
      <GithubFilled />
      <WechatFilled @click="setLoginState(LoginStateEnum.WX_MINI)" />
      <AlipayCircleFilled />
      <GoogleCircleFilled />
      <TwitterCircleFilled />
    </div>
  </Form>
</template>
<script lang="ts" setup>
  import { reactive, ref, toRaw, unref, computed, onMounted, onUnmounted } from 'vue';
  import { Checkbox, Form, Input, Row, Col, Button, Divider, Image } from 'ant-design-vue';
  import {
    GithubFilled,
    WechatFilled,
    AlipayCircleFilled,
    GoogleCircleFilled,
    TwitterCircleFilled,
  } from '@ant-design/icons-vue';
  import LoginFormTitle from './LoginFormTitle.vue';
  import { doGetCode } from '@/api/sys/user';
  import { useI18n } from '@/hooks/web/useI18n';
  import { useMessage } from '@/hooks/web/useMessage';
  import { useUserStore } from '@/store/modules/user';
  import { LoginStateEnum, useLoginState, useFormRules, useFormValid } from './useLogin';
  import { useDesign } from '@/hooks/web/useDesign';
  import { EncryptionFactory } from '@/utils/cipher';
  import { RememberLoing } from '@/api/sys/model/userModel';
  import { getAuthCache, setAuthCache } from '@/utils/auth';
  import { REMEMBER } from '@/enums/cacheEnum';

  //import { onKeyStroke } from '@vueuse/core';

  const ACol = Col;
  const ARow = Row;
  const FormItem = Form.Item;
  const InputPassword = Input.Password;
  const { t } = useI18n();
  const { notification, createErrorModal } = useMessage();
  const { prefixCls } = useDesign('login');
  const userStore = useUserStore();
  const encryption = EncryptionFactory.createAesEncryption();
  const { setLoginState, getLoginState } = useLoginState();
  const { getFormRules } = useFormRules();
  const formRef = ref();
  const loading = ref(false);
  const rememberMe = ref(false);

  const formData = reactive({
    username: '',
    password: '',
    key: '',
    loginCode: '',
    images: '',
    timer : undefined as any
  });

  const { validForm } = useFormValid(formRef);

  //onKeyStroke('Enter', handleLogin);

  const getShow = computed(() => unref(getLoginState) === LoginStateEnum.LOGIN);

  onMounted(() => {
    init();
    GetCode();
    formData.timer = setInterval(()=>GetCode(),1000*60*1)
   ;
  });

  onUnmounted(()=>{
    formData.timer &&  clearInterval(formData.timer);
  })
  const init = () => {
    const rememberLoing = getAuthCache<RememberLoing>(REMEMBER);
    if (!!rememberLoing) {
      const { rememberMe: rem, username: account, password: paswd } = rememberLoing;
      rememberMe.value = rem;
      formData.username = account;
      formData.password = paswd;
    }
  };

  const GetCode = async () => {
    const { key, image } = await doGetCode();
    formData.images = image;
    formData.key = key;
    formData.loginCode = '';
  };

  async function handleLogin() {
    const data = await validForm();
    if (!data) return;
    try {
      loading.value = true;
      const userInfo = await userStore.login(
        toRaw({
          grantType: 'code',
          loginType:'WEB_ACCOUNT',
          code: {
            username: encryption.encrypt(data.username),
            password: encryption.encrypt(data.password),
            key: formData.key,
            verificationCode: data.loginCode,
          },
          mode: 'none', //不要默认的错误提示
        }),
      );
      if (userInfo) {
        notification.success({
          message: t('sys.login.loginSuccessTitle'),
          description: `${t('sys.login.loginSuccessDesc')}: ${userInfo.userName}`,
          duration: 3,
        });
        //存入缓存
        setAuthCache(REMEMBER, {
          rememberMe: unref(rememberMe),
          username: unref(rememberMe) ? unref(formData.username) : '',
          password: unref(rememberMe) ? unref(formData.password) : '',
        });
      }
    } catch (error) {
      createErrorModal({
        title: t('sys.api.errorTip'),
        content: (error as unknown as Error).message || t('sys.api.networkExceptionMsg'),
        getContainer: () => document.body.querySelector(`.${prefixCls}`) || document.body,
      });
    } finally {
      loading.value = false;
    }
  }
</script>
<style lang="less">
  @prefix-cls: ~'@{namespace}-login-from';

  .@{prefix-cls} {
    .login-code-input {
      input{
        min-width: unset !important;
      }
    }
  }
</style>
