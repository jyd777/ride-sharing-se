<template>
  <NavigationBar />
    <view class="container">
      <!-- 身份选择 -->
      <view class="identity-selector">
        <view
          class="identity-option"
          :class="{ 'selected': identity === 'driver' }"
          @click="identity = 'driver'"
        >
          车主
        </view>
        <view
          class="identity-option"
          :class="{ 'selected': identity === 'passenger' }"
          @click="identity = 'passenger'"
        >
          乘客
        </view>
      </view>

      <!-- 地图容器 -->
      <view class="map-container">
        <map
          id="uni-map"
          class="map"
          :latitude="centerLat"
          :longitude="centerLng"
          :markers="markers"
          :polyline="polyline"
          show-location
        ></map>
      </view>

      <!-- 地址输入 -->
      <view class="address-container">
        <view class="address-input">
          <view class="input-group">
            <view class="label-container">
              <image src="../../static/start.png" class="input-icon"></image>
              <text class="input-label">起点</text>
            </view>
            <input
              v-model="startAddress"
              @input="handleStartInput"
              placeholder="请输入起点"
              class="address-input-field"
            />
            <!-- 起点建议列表 -->
            <view v-if="startSuggestions.length > 0" class="suggestions">
              <view
                v-for="(item, index) in startSuggestions"
                :key="index"
                @click="selectStartAddress(item)"
                class="suggestion-item"
              >
                {{ item.name }} <text v-if="item.address" style="font-size: 22rpx; color: #888;"> ({{ item.address }})</text>
              </view>
            </view>
          </view>

          <view class="input-group">
            <view class="label-container">
              <image src="../../static/dest.png" class="input-icon"></image>
              <text class="input-label">终点</text>
            </view>
            <input
              v-model="endAddress"
              @input="handleEndInput"
              placeholder="请输入终点"
              class="address-input-field"
            />
             <!-- 终点建议列表 -->
            <view v-if="endSuggestions.length > 0" class="suggestions">
              <view
                v-for="(item, index) in endSuggestions"
                :key="index"
                @click="selectEndAddress(item)"
                class="suggestion-item"
              >
                 {{ item.name }} <text v-if="item.address" style="font-size: 22rpx; color: #888;"> ({{ item.address }})</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 订单信息 -->
      <view class="order-info">
        <view class="info-item">
          <text class="info-label">出发时间</text>
           <!-- 日期选择 -->
          <picker
            mode="date"
            :value="departureDate"
            :start="currentDate"
            @change="handleDateChange"
            class="info-picker date-picker"
          >
            <view class="picker-text">{{ departureDate }}</view>
          </picker>
           <!-- 时间选择 -->
          <picker
            mode="time"
            :value="departureTime"
            @change="handleTimeChange"
            class="info-picker time-picker"
          >
            <view class="picker-text">{{ departureTime }}</view>
          </picker>
        </view>

        <!-- 司机特定选项 -->
        <view v-if="identity === 'driver'">
          <view class="info-item">
            <text class="info-label">车辆选择</text>
            <picker
              mode="selector"
              :range="vehicleList"
              range-key="plateNumber" 
              @change="handleVehicleChange"
              class="info-picker"
              :disabled="vehicleList.length === 0" 
            >
              <view class="picker-text" :class="{'picker-placeholder': !selectedVehicle}">
                 <!-- 显示车牌号和车型 -->
                {{ selectedVehicle ? `${selectedVehicle.plateNumber} (${selectedVehicle.carType || '未知车型'})` : (vehicleList.length === 0 ? '无可用车辆' : '请选择车辆') }}
              </view>
            </picker>
          </view>

          <view class="info-item">
            <text class="info-label">余座</text>
            <picker
              mode="selector"
              :range="availableSeats"
              @change="handleSeatChange"
              class="info-picker"
              :disabled="!selectedVehicle" 
            >
              <view class="picker-text" :class="{'picker-placeholder': !selectedSeats}">
                {{ selectedSeats ? selectedSeats + ' 座' : '请选择余座' }}
              </view>
            </picker>
          </view>
        </view>

        <!-- 乘客特定选项 -->
        <view v-if="identity === 'passenger'" class="info-item">
          <text class="info-label">同乘人数</text>
          <picker
            mode="selector"
            :range="passengerCountOptions"
            @change="handlePassengerCountChange"
            class="info-picker"
          >
            <view class="picker-text">
              {{ passengerCount }} 人
            </view>
          </picker>
        </view>

        <!-- 价格 -->
        <view class="info-item">
          <text class="info-label">价格预期</text>
          <view class="price-input-container">
            <input
              v-model="price"
              type="digit" 
              placeholder="请输入价格"
              class="price-input"
            />
            <text class="price-unit">元</text>
          </view>
        </view>
      </view>

      <!-- 发布按钮 -->
      <button class="publish-button" @click="handlePublish" :disabled="isPublishing">
        {{ isPublishing ? '发布中...' : '发布' }}
      </button>
    </view>
  </template>

<script>
import NavigationBar from '../../components/NavigationBar.vue';
// --- 配置后端 API 地址 ---
// --- !!! 确保这个地址和你的 Flask 后端运行地址一致 !!! ---
const API_BASE_URL = 'http://localhost:5000'; // 或者你的服务器 IP 地址

export default {
  components: {
    NavigationBar
  },
  data() {
    return {
      identity: 'driver', // 默认身份 'driver' 或 'passenger'
      startAddress: '',   // 起点名称
      endAddress: '',     // 终点名称
      startSuggestions: [], // 起点建议列表
      endSuggestions: [],   // 终点建议列表
      startPos: null, // 起点坐标 [经度, 纬度]
      endPos: null,   // 终点坐标 [经度, 纬度]
      centerLat: 31.238, // 默认地图中心纬度 (上海市大致中心)
      centerLng: 121.48, // 默认地图中心经度 (上海市大致中心)
      zoom: 14,       // 地图缩放级别
      markers: [],    // 地图标记点
      polyline: [],   // 地图路线
      departureDate: '', // 出发日期 YYYY-MM-DD
      departureTime: '', // 出发时间 HH:MM
      vehicleList: [], // 用户车辆列表 (从后端获取)
      selectedVehicle: null, // 用户选择的车辆对象 { id, plateNumber, seats, carType }
      availableSeats: [], // 可选的剩余座位数 [1, 2, ...]
      selectedSeats: null, // 司机选择的剩余座位数 (数字)
      price: '', // 价格预期 (字符串，后端处理为数字)
      currentDate: '', // 当前日期，用于限制日期选择器的起始日期
      mapContext: null, // 地图上下文对象
      passengerCount: 1, // 乘客选择的同乘人数 (默认1)
      passengerCountOptions: Array.from({ length: 10 }, (_, i) => i + 1), // 可选同乘人数 [1, 2, ..., 10]
      isPublishing: false, // 是否正在发布中 (防止重复点击)
      userId: 1, // 当前登录用户的 ID (需要从本地存储获取)
      // --- 高德 Key ---
      // --- !!! 请务必替换为你自己的 Key !!! ---
      amapKey: '9979fdc383e13ee57c582bc869dbd690' // 你的高德Web服务API Key
      // -----------------
    };
  },
  onLoad() {
    // 页面加载时执行
    // --- 获取当前登录用户 ID ---
    // --- !!! 这里需要你根据实际登录逻辑，从本地存储中获取用户 ID !!! ---
    // const storedUserId = uni.getStorageSync('user_id'); // 假设登录后将 user_id 存入 storage
    const storedUserId=1
    if (storedUserId) {
      this.userId = parseInt(storedUserId); // 转换为数字
      console.log("当前用户 ID:", this.userId);
      // 获取到用户 ID 后，再去请求该用户的车辆列表
      this.fetchVehicleList();
    } else {
      // 如果没有获取到用户 ID
      console.error("未能获取到用户 ID，请确保用户已登录!");
      uni.showModal({
        title: '提示',
        content: '您尚未登录，无法发布订单。是否前往登录？',
        success: (res) => {
          if (res.confirm) {
            // 跳转到登录页 (你需要修改为你的登录页面路径)
            // uni.navigateTo({ url: '/pages/login/login' });
             uni.navigateBack(); // 或者先返回上一页
          } else {
             uni.navigateBack(); // 取消则返回上一页
          }
        }
      });
    }
    // ---------------------------
  },
  mounted() {
    // 页面挂载时执行 (DOM 准备好之后)
    this.initCurrentDateTime(); // 初始化当前日期和时间
    this.initMap(); // 初始化地图上下文
    // fetchVehicleList 移动到 onLoad 获取 userId 之后调用
  },
  methods: {
    // 初始化当前日期和时间，并设置默认值
    initCurrentDateTime() {
      const now = new Date();
      const year = now.getFullYear();
      // 月份和日期补零
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      // 小时和分钟补零
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');

      this.currentDate = `${year}-${month}-${day}`; // 设置可选的最早日期
      this.departureDate = this.currentDate;      // 默认出发日期为今天
      this.departureTime = `${hours}:${minutes}`; // 默认出发时间为当前时间
    },
    // 初始化地图上下文
    initMap() {
      // 确保在 nextTick 中创建，等待地图组件渲染完成
      this.$nextTick(() => {
        this.mapContext = uni.createMapContext('uni-map', this);
        if (!this.mapContext) {
            console.error("创建 map context 失败");
        } else {
            // 可以尝试获取当前位置作为地图中心点 (可选)
            // this.getCurrentLocation();
        }
      });
    },
    // 获取用户车辆列表 (调用后端 API)
    async fetchVehicleList() {
      if (!this.userId) return; // 必须有用户 ID

      uni.showLoading({ title: '加载车辆...' });
      try {
        const res = await uni.request({
          url: `${API_BASE_URL}/api/user/${this.userId}/vehicles`, // 请求后端接口
          method: 'GET',
          // 如果你的后端接口需要登录凭证 (Token)
          // header: {
          //   'Authorization': 'Bearer ' + uni.getStorageSync('token')
          // }
        });

        if (res.statusCode === 200 && Array.isArray(res.data)) {
          this.vehicleList = res.data; // 更新车辆列表数据
          console.log("从后端获取车辆列表成功:", this.vehicleList);
          if (this.vehicleList.length === 0 && this.identity === 'driver') {
             // 如果是司机身份但没有车，给个提示
             uni.showToast({ title: '您还未添加车辆信息', icon: 'none' });
          }
        } else {
          // 请求失败或返回数据格式不正确
          console.error('获取车辆列表失败:', res);
          uni.showToast({ title: `加载车辆失败 (${res.statusCode})`, icon: 'none' });
          this.vehicleList = []; // 清空列表
        }
      } catch (error) {
        // 网络请求本身失败
        console.error('请求车辆列表接口异常:', error);
        uni.showToast({ title: '网络错误，加载车辆失败', icon: 'none' });
        this.vehicleList = []; // 清空列表
      } finally {
        uni.hideLoading(); // 隐藏加载提示
      }
    },
    // 起点输入框内容变化时触发
    handleStartInput() {
      // 使用 debounce 或 throttle 优化，防止频繁请求 API (可选)
      if (this.startAddress.length > 1) { // 输入超过1个字符时开始搜索
        this.searchAddress(this.startAddress, 'start');
      } else {
        this.startSuggestions = []; // 清空建议
      }
    },
    // 终点输入框内容变化时触发
    handleEndInput() {
      if (this.endAddress.length > 1) {
        this.searchAddress(this.endAddress, 'end');
      } else {
        this.endSuggestions = [];
      }
    },
    // 调用高德 API 搜索地址建议
    async searchAddress(query, type) {
      try {
        const res = await uni.request({
          url: 'https://restapi.amap.com/v3/assistant/inputtips', // 高德输入提示 API
          data: {
            keywords: query,
            key: this.amapKey, // 使用 data 中的 amapKey
            // city: '上海', // 可以指定城市，或者留空进行全国搜索
            output: 'JSON'
          }
        });

        if (res.statusCode === 200 && res.data.status === '1' && Array.isArray(res.data.tips)) {
          // 过滤掉没有有效坐标的建议
          const suggestions = res.data.tips
            .filter(tip => tip.location && typeof tip.location === 'string' && tip.location.includes(','))
            .map(tip => ({
              name: tip.name, // POI 名称
              address: tip.address || '', // 详细地址 (可能为空)
              location: tip.location.split(',') // 经纬度数组 [lng, lat]
            }));

          // 更新对应的建议列表
          if (type === 'start') {
            this.startSuggestions = suggestions;
          } else {
            this.endSuggestions = suggestions;
          }
        } else {
          // API 返回错误或无结果
          if (type === 'start') this.startSuggestions = [];
          else this.endSuggestions = [];
        }
      } catch (error) {
        // 网络请求错误
        console.error('地址搜索 API 请求失败:', error);
        if (type === 'start') this.startSuggestions = [];
        else this.endSuggestions = [];
      }
    },
    // 选择起点建议
    selectStartAddress(item) {
      this.startAddress = item.name; // 将输入框设置为建议的名称
      // 解析经纬度并确保是数字
      const lng = parseFloat(item.location[0]);
      const lat = parseFloat(item.location[1]);
      if (!isNaN(lng) && !isNaN(lat)) {
        this.startPos = [lng, lat]; // 保存坐标
      } else {
        console.error("选择的起点坐标无效:", item.location);
        this.startPos = null; // 无效则清空
         uni.showToast({ title: '起点位置信息无效', icon: 'none'});
      }
      this.startSuggestions = []; // 清空建议列表
      this.updateMap(); // 更新地图显示
    },
    // 选择终点建议
    selectEndAddress(item) {
      this.endAddress = item.name;
      const lng = parseFloat(item.location[0]);
      const lat = parseFloat(item.location[1]);
      if (!isNaN(lng) && !isNaN(lat)) {
        this.endPos = [lng, lat];
      } else {
        console.error("选择的终点坐标无效:", item.location);
        this.endPos = null;
         uni.showToast({ title: '终点位置信息无效', icon: 'none'});
      }
      this.endSuggestions = [];
      this.updateMap();
    },
    // 更新地图标记、中心点和路线
    async updateMap() {
        if (this.startPos && this.endPos) {
          this.centerLng = this.startPos[0];
          this.centerLat = this.startPos[1];
          
          this.markers = [
            {
              id: 1,
              latitude: this.startPos[1],
              longitude: this.startPos[0],
              title: '起点',
              iconPath: '../../static/start.png',
              width: 20,
              height: 20
            },
            {
              id: 2,
              latitude: this.endPos[1],
              longitude: this.endPos[0],
              title: '终点',
              iconPath: '../../static/dest.png',
              width: 20,
              height: 20
            }
          ];
          
          await this.drawRoute();
        }
      },
    // 调用高德 API 绘制驾车路线
    async drawRoute() {
      // 必须有有效的起点和终点坐标
       if (!this.startPos || !this.endPos || isNaN(this.startPos[0]) || isNaN(this.startPos[1]) || isNaN(this.endPos[0]) || isNaN(this.endPos[1])) {
         this.polyline = []; // 清空路线
         return;
       }

      try {
        const res = await uni.request({
          url: 'https://restapi.amap.com/v3/direction/driving', // 高德驾车路线规划 API
          data: {
            origin: this.startPos.join(','), // 起点坐标 "lng,lat"
            destination: this.endPos.join(','), // 终点坐标 "lng,lat"
            key: this.amapKey, // 使用 data 中的 amapKey
            // extensions: 'base' // 可选：base / all
          }
        });

        if (res.statusCode === 200 && res.data.status === '1' && res.data.route && res.data.route.paths && res.data.route.paths.length > 0) {
          const path = res.data.route.paths[0]; // 取第一条规划路径
          let pointsArr = []; // 存储路线坐标点

          // 解析路径中的每一步 (step) 的坐标串 (polyline)
          path.steps.forEach(step => {
            if (step.polyline) {
              step.polyline.split(';').forEach(pointStr => {
                if (pointStr) {
                  const coords = pointStr.split(',');
                  if (coords.length === 2) {
                    const lng = parseFloat(coords[0]);
                    const lat = parseFloat(coords[1]);
                    // 确保解析出的坐标是有效的数字
                    if (!isNaN(lng) && !isNaN(lat)) {
                      pointsArr.push({ latitude: lat, longitude: lng });
                    }
                  }
                }
              });
            }
          });

          // 更新地图上的路线数据
          if (pointsArr.length > 0) {
              this.polyline = [{
                points: pointsArr,
                color: '#007AFF', // 路线颜色 (蓝色)
                width: 6,        // 路线宽度
                dottedLine: false // 是否为虚线
              }];
          } else {
              this.polyline = []; // 如果解析不出点，则清空路线
          }

        } else {
          // API 返回错误或没有路径规划结果
          console.warn("高德路线规划失败或无路径:", res.data.info);
          this.polyline = []; // 清空路线
        }
      } catch (error) {
        // 网络请求本身失败
        console.error('路线规划 API 请求失败:', error);
        this.polyline = []; // 清空路线
      }
    },
    // 日期选择器变化
    handleDateChange(e) {
      this.departureDate = e.detail.value;
    },
    // 时间选择器变化
    handleTimeChange(e) {
      this.departureTime = e.detail.value;
    },
    // 车辆选择器变化 (司机)
    handleVehicleChange(e) {
      const index = parseInt(e.detail.value); // 获取选中项的索引
       if (isNaN(index) || index < 0 || index >= this.vehicleList.length) {
           this.selectedVehicle = null;
           this.availableSeats = [];
       } else {
           this.selectedVehicle = this.vehicleList[index]; // 获取选中的车辆对象
           // 根据车辆总座位数，更新可选的剩余座位数 (至少1座)
           if (this.selectedVehicle && this.selectedVehicle.seats > 1) {
             this.availableSeats = Array.from(
               // 可提供座位数为 1 到 (总座位数 - 1)
               { length: this.selectedVehicle.seats - 1 },
               (_, i) => i + 1
             );
           } else {
             this.availableSeats = []; // 如果车辆信息无效或只有1座，则无可选余座
           }
       }
      this.selectedSeats = null; // 重置已选的余座数
    },
    // 余座选择器变化 (司机)
    handleSeatChange(e) {
      const index = parseInt(e.detail.value);
      if (!isNaN(index) && index >= 0 && index < this.availableSeats.length) {
         this.selectedSeats = this.availableSeats[index]; // 获取选中的座位数
      } else {
         this.selectedSeats = null;
      }
    },
    // 同乘人数选择器变化 (乘客)
    handlePassengerCountChange(e) {
      const index = parseInt(e.detail.value);
      if (!isNaN(index) && index >= 0 && index < this.passengerCountOptions.length) {
          this.passengerCount = this.passengerCountOptions[index]; // 获取选中的人数
      } else {
          this.passengerCount = 1; // 默认或无效选择时设为1
      }
    },

    // --- 点击“发布”按钮 ---
    async handlePublish() {
      if (this.isPublishing) return; // 如果正在发布，则阻止重复点击

      // --- 前端数据校验 ---
      // 1. 检查用户 ID
      if (!this.userId) {
        uni.showToast({ title: '无法获取用户信息，请重新登录', icon: 'none' });
        return;
      }
      // 2. 检查起点和终点
      if (!this.startAddress || !this.endAddress || !this.startPos || !this.endPos) {
        uni.showToast({ title: '请选择有效的起点和终点', icon: 'none' });
        return;
      }
       // 3. 检查出发时间
      if (!this.departureDate || !this.departureTime) {
        uni.showToast({ title: '请选择出发日期和时间', icon: 'none' });
        return;
      }
      // 检查选择的时间是否已过时 (可选，增加用户体验)
      const selectedDateTime = new Date(`${this.departureDate} ${this.departureTime}`);
      if (selectedDateTime < new Date()) {
          uni.showToast({ title: '出发时间不能早于当前时间', icon: 'none' });
          return;
      }
      // 4. 检查价格
      const priceFloat = parseFloat(this.price);
      if (isNaN(priceFloat) || priceFloat <= 0) {
        uni.showToast({ title: '请输入有效的价格 (大于0)', icon: 'none' });
        return;
      }

      // 5. 根据身份检查特定字段
      if (this.identity === 'driver') {
        if (!this.selectedVehicle) {
          uni.showToast({ title: '请选择车辆', icon: 'none' });
          return;
        }
        if (!this.selectedSeats) {
          uni.showToast({ title: '请选择提供的余座数', icon: 'none' });
          return;
        }
      } else { // passenger
        if (!this.passengerCount || this.passengerCount < 1) {
          // passengerCount 默认是 1，理论上不会小于1，但做个检查
          uni.showToast({ title: '请选择有效的同乘人数', icon: 'none' });
          return;
        }
      }

      // --- 构造发送到后端的数据对象 ---
      const orderData = {
        initiator_id: this.userId, // 当前用户 ID
        identity: this.identity,  // 身份：'driver' 或 'passenger'
        startAddress: this.startAddress, // 起点名称
        endAddress: this.endAddress,   // 终点名称
        // 格式化出发时间为 'YYYY-MM-DD HH:MM:SS' (秒可选，看后端是否需要)
        departureTime: `${this.departureDate} ${this.departureTime}:00`,
        price: priceFloat, // 发送数字类型的价格

        // 仅当身份是 driver 时，包含以下字段
        vehicleId: this.identity === 'driver' ? this.selectedVehicle.id : null,
        availableSeats: this.identity === 'driver' ? this.selectedSeats : null,
        // 尝试包含车辆类型，如果 selectedVehicle 里有 carType 字段
        carType: this.identity === 'driver' && this.selectedVehicle ? this.selectedVehicle.carType : null,

        // 仅当身份是 passenger 时，包含以下字段
        passengerCount: this.identity === 'passenger' ? this.passengerCount : null
      };

      console.log("准备发送到后端的订单数据:", orderData);

      // --- 发起 API 请求 ---
      this.isPublishing = true; // 设置为发布中状态
      uni.showLoading({ title: '正在发布...' });

      try {
        const res = await uni.request({
          url: `${API_BASE_URL}/api/orders`, // 后端创建订单的接口地址
          method: 'POST',
          data: orderData, // 发送 JOSN 数据
          header: {
            'Content-Type': 'application/json' // 明确指定 Content-Type
            // 如果需要身份验证 Token
            // 'Authorization': 'Bearer ' + uni.getStorageSync('token')
          }
        });

        uni.hideLoading(); // 隐藏加载提示

        // --- 处理后端响应 ---
        if (res.statusCode === 201) { // 201 Created 表示成功
          console.log('订单发布成功，后端返回:', res.data);
          uni.showToast({
            title: `发布成功！订单ID: ${res.data.orderId}`, // 显示成功信息和订单 ID
            icon: 'success',
            duration: 2000 // 显示 2 秒
          });

          // 发布成功后的操作：例如，延时后返回上一页
          setTimeout(() => {
            uni.navigateBack(); // 返回来源页面
            // 或者跳转到订单列表/详情页等
            // uni.redirectTo({ url: `/pages/order/list` });
          }, 1500); // 延时 1.5 秒

        } else {
          // 后端返回了错误状态码
          console.error('订单发布失败，后端返回:', res);
          // 尝试显示后端返回的错误信息，否则显示通用错误
          const errorMsg = (res.data && res.data.error) ? res.data.error : '订单发布失败，请检查信息或稍后重试';
          uni.showToast({
            title: errorMsg,
            icon: 'none', // 无图标，错误信息较长时更清晰
            duration: 3000 // 显示 3 秒
          });
        }
      } catch (error) {
        // uni.request 本身发生网络错误等异常
        uni.hideLoading();
        console.error('请求发布订单接口时发生异常:', error);
        uni.showToast({
          title: '网络连接错误，发布失败',
          icon: 'none'
        });
      } finally {
        this.isPublishing = false; // 无论成功失败，最终都解除发布中状态
      }
    }
  }
};
</script>

<style>
/* --- 保持你之前的样式，或者根据需要进行调整 --- */
/* --- 你可以复制粘贴上一份回答中提供的样式代码 --- */

/* 确保容器有足够的底部内边距，防止按钮被遮挡 */
.container {
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  padding-bottom: 120rpx; /* 为发布按钮留出空间 */
}

/* 身份选择器 */
.identity-selector {
  display: flex;
  margin-bottom: 20rpx;
  border-radius: 10rpx;
  overflow: hidden;
  border: 1rpx solid #007AFF; /* 主题蓝 */
}
.identity-option {
  flex: 1;
  padding: 15rpx 10rpx;
  text-align: center;
  font-weight: bold;
  color: #007AFF;
  background-color: #fff;
  transition: background-color 0.2s ease, color 0.2s ease;
}
.identity-option.selected {
  background-color: #007AFF;
  color: white;
}

/* 地图容器 */
.map-container {
  height: 350rpx;
  width: 100%;
  border-radius: 10rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
  border: 1rpx solid #eee;
}
.map {
  width: 100%;
  height: 100%;
}

/* 地址输入区域 */
.address-container {
  border: 1rpx solid #eee;
  border-radius: 10rpx;
  background-color: white;
  padding: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}
.address-input {
  margin-bottom: 0;
}
.input-group {
  margin-bottom: 20rpx;
  position: relative; /* 为了建议列表的绝对定位 */
}
.input-group:last-child {
    margin-bottom: 0;
}
.label-container {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
}
.input-icon {
  width: 30rpx;
  height: 30rpx;
  margin-right: 10rpx;
}
.input-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}
.address-input-field {
  border: 1rpx solid #ddd;
  padding: 15rpx 20rpx;
  border-radius: 8rpx;
  width: 100%;
  box-sizing: border-box;
  font-size: 28rpx;
  min-height: 70rpx;
  line-height: normal;
}

/* 地址建议列表 */
.suggestions {
  position: absolute;
  top: calc(100% + 5rpx); /* 定位在输入框下方 */
  left: 0;
  right: 0;
  background: white;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  z-index: 100; /* 确保在顶层 */
  max-height: 300rpx; /* 限制最大高度，出现滚动条 */
  overflow-y: auto;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}
.suggestion-item {
  padding: 20rpx;
  border-bottom: 1rpx solid #eee;
  font-size: 26rpx;
  cursor: pointer;
}
.suggestion-item:last-child {
  border-bottom: none;
}
.suggestion-item:active {
  background-color: #f0f0f0; /* 点击反馈 */
}


/* 订单信息区域 */
.order-info {
  background-color: white;
  padding: 20rpx;
  border-radius: 10rpx;
  margin-bottom: 30rpx;
  border: 1rpx solid #eee;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}
.info-item {
  margin-bottom: 25rpx;
  display: flex;
  align-items: center; /* 垂直居中对齐 */
  flex-wrap: wrap; /* 允许内容换行 */
}
 .info-item:last-child {
    margin-bottom: 0;
 }
.info-label {
  width: 100%; /* 标签占满整行 */
  margin-bottom: 10rpx;
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

/* 选择器和价格输入框统一样式 */
.info-picker, .price-input {
  border: 1rpx solid #ddd;
  padding: 0 20rpx; /* 左右内边距 */
  border-radius: 8rpx;
  background-color: white;
  width: 100%;
  box-sizing: border-box;
  height: 70rpx; /* 固定高度 */
  line-height: 70rpx; /* 垂直居中文本 */
  font-size: 28rpx;
  color: #333;
  overflow: hidden; /* 防止文本溢出 */
  white-space: nowrap;
  text-overflow: ellipsis;
}
/* 为日期和时间选择器分配宽度，使它们能在同一行显示 */
.date-picker {
  width: calc(55% - 10rpx); /* 示例：日期占55%宽度，减去间距 */
  margin-right: 20rpx;      /* 右边距 */
  display: inline-block;     /* 改为行内块 */
  vertical-align: middle;    /* 垂直居中对齐 */
}
.time-picker {
   width: calc(45% - 10rpx); /* 示例：时间占45%宽度，减去间距 */
   display: inline-block;      /* 改为行内块 */
   vertical-align: middle;     /* 垂直居中对齐 */
}

/* 选择器占位符样式 */
.picker-placeholder {
  color: #999;
}

/* 价格输入容器 */
.price-input-container {
  display: flex;
  align-items: center;
  width: 100%;
}
.price-input {
  flex: 1; /* 输入框占据剩余空间 */
  margin-right: 15rpx; /* 和单位的间距 */
}
.price-unit {
  font-size: 28rpx;
  color: #555;
}

/* 发布按钮 */
.publish-button {
  background-color: #007AFF;
  color: white;
  border-radius: 10rpx;
  padding: 20rpx 0; /* 增加上下内边距 */
  font-size: 32rpx;
  font-weight: bold;
  width: 100%;
  margin-top: 20rpx; /* 与上方元素的间距 */
  border: none;
  line-height: normal;
}
.publish-button:active {
    background-color: #0056b3; /* 点击时颜色变深 */
}
.publish-button[disabled] { /* 禁用状态样式 */
    background-color: #cce5ff; /* 浅蓝色背景 */
    color: #a0a0a0;          /* 灰色文字 */
    cursor: not-allowed;     /* 禁用光标 */
}
.publish-button[disabled]:active { /* 禁用时点击不变色 */
    background-color: #cce5ff;
}

</style>