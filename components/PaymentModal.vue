<template>
  <view class="modal" v-if="visible">
    <view class="modal-content">
      <view class="modal-header">
        <text>请支付 {{ amount }} 元</text>
      </view>
      <view class="modal-body">
        <img src="../static/QR-code.png" class="qr-code" alt="QR Code">
      </view>
      <view class="modal-footer">
        <button class="close-button" @click="closeModal">关闭</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    amount: {
      type: Number,
      required: true
    }
  },
  methods: {
    closeModal() {
      this.$emit('close');
    }
  },
  mounted() {
    // 移除加载 qrcode 库的逻辑
  }
};
</script>

<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modal-content {
  background: white;
  border-radius: 10px;
  padding: 20px;
  width: 80%;
  max-width: 300px;
  text-align: center;
  z-index: 9999;
}

.modal-header {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}

.modal-body {
  margin-bottom: 10px;
}

.qr-code {
  width: 100%;
  height: 100%;
}

.modal-footer {
  display: flex;
  justify-content: center;
}

.close-button {
  padding: 10px 20px;
  font-size: 14px;
  background-color: #007aff;
  color: white;
  border: none;
  border-radius: 5px;
}
</style>