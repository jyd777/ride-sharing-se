<template>
	<div>
		<!-- 使用 NavigationBar 组件 -->
		<NavigationBar />
		<!-- 支付弹窗 -->
		<PaymentModal :visible="showPaymentModal" :amount="trips[0].price" @close="closePaymentModal" />
		<!-- 评价弹窗 -->
		<view class="rate-modal" v-if="showRateModal">
			<view class="rate-content">
				<text class="rate-title">请为本次行程评分</text>
					<view class="stars-container">
						<view v-for="i in 5" :key="i" @click="setRating(i)" class="star">
							<image 
								:src="i <= currentRating ? '../../static/star-filled.png' : '../../static/star-empty.png'" 
								class="star-icon" 
							/>
						</view>
					</view>
				<view class="rate-buttons">
					<button class="cancel-button" @click="cancelRating">取消</button>
					<button class="submit-button" @click="submitRating">提交评价</button>
				</view>
			</view>
		</view>
		<!-- 地图容器 -->
		<map id="uni-map" class="map-container" :longitude="centerLng" :latitude="centerLat" :markers="markers"
			:polyline="polyline" :scale="14" style="width: 100%; height: 400px;"></map>
		<!-- 行程详情 -->
		<view class="order-scroll" scroll-y="true" style="height:calc(100vh - 200px);">
			<view class="order-info" v-for="trip in trips" :key="trip.id">
				<view class="order-card">
					<view class="order-header">
						<text>{{ trip.date }}</text>
						<view class="button-container">
							<button v-if="trip.state === '待评价'" class="rate-button" @click="showRatingModal">评价</button>
							<button class="join-button" @click="handleButtonClick(trip)">{{ trip.state }}</button>
						</view>
					</view>
					<view class="order-details">
						<view class="start-point">
							<image src="../../static/start.png" class="icon" style="height:20px;width:20px" />
							<text class="order-text">{{ trip.startPoint }}</text>
						</view>
						<view class="departure-point">
							<image src="../../static/dest.png" class="icon" style="height:20px;width:20px" />
							<text class="order-text">{{ trip.endPoint }}</text>
						</view>
					</view>
					<view class="separator" />
					<view class="order-summary">
						<view class="summary-content">
							<image :src="trip.userAvatar" class="user-avatar" />
							<view class="car-info">
								<view class="car-type-summary">
									<text class="car-type">{{ trip.carType }}</text>
								</view>
								<view class="order-count-summary">
									<text class="order-count">接单{{ trip.orderCount }}次</text>
								</view>
							</view>
							<view class="price-info">
								<text class="price-text"
									style="color:#003366;font-weight:bold;">预估{{ trip.price }}元</text>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>
	</div>
</template>

<script>
	import NavigationBar from '../../components/NavigationBar.vue';
	import PaymentModal from '../../components/PaymentModal.vue';

	export default {
		components: {
			NavigationBar,
			PaymentModal
		},
		data() {
			return {
				mapContext: null,
				centerLng: 121.214345,
				centerLat: 31.285985,
				trips: [{
					id: 1,
					date: '3月7日14:30',
					startPoint: '同济大学（四平校区）',
					endPoint: '四平路地铁站',
					price: 41,
					carType: '奔驰 奔驰EQC',
					orderCount: 15,
					userAvatar: '../../static/user.jpeg',
					state: '待评价' // 修改为待评价状态用于测试
				}],
				showPaymentModal: false,
				showRateModal: false,
				currentRating: 0,
				markers: [],
				polyline: []
			};
		},
		mounted() {
			this.initMap();
			this.drawRoute();
			this.geocodeAddress()
		},
		methods: {
			initMap() {
				this.mapContext = uni.createMapContext('uni-map');
			},
			async drawRoute() {
				const trip = this.trips[0];
				const {
					startPoint,
					endPoint
				} = trip;
				console.log(startPoint);
				console.log(endPoint);
				// 使用地理编码服务将地址转换为经纬度
				const [startPos, endPos] = await Promise.all([
					this.transFormAddress(startPoint),
					this.transFormAddress(endPoint)
				]);

				if (!startPos || !endPos) {
					console.error('地址解析失败');
					return;
				}
				console.log(startPos);
				console.log(endPos);
				// 计算起点和终点的中点
				// this.centerLng = (startPos[0] + endPos[0]) / 2;
				// this.centerLat = (startPos[1] + endPos[1]) / 2;
				this.centerLng = startPos[0];
				this.centerLat = startPos[1];

				// 添加起点和终点标记
				this.markers = [{
						id: 1,
						latitude: startPos[1],
						longitude: startPos[0],
						title: '起点',
						iconPath: '../../static/start.png',
						width: 20,
						height: 20
					},
					{
						id: 2,
						latitude: endPos[1],
						longitude: endPos[0],
						title: '终点',
						iconPath: '../../static/dest.png',
						width: 20,
						height: 20
					}
				];

				// 调用驾车路径规划服务
				const route = await this.getDrivingRoute(startPos, endPos);
				if (route) {
					let pointsArr = []
					route.paths[0].steps.map(step => step.polyline).flat().map(point => point.split(';').map(item => {
						pointsArr.push({
							latitude: item.split(',')[1],
							longitude: item.split(',')[0],
						})
					}))
					this.polyline = [{
						points: pointsArr,
						color: '#FF0000',
						width: 6,
						dottedLine: true
					}];
				}
			},
			geocodeAddress(address) {
				return new Promise((resolve, reject) => {
					uni.getLocation({
						success: (res) => {
							resolve([res.longitude, res.latitude]);
						},
						fail: (err) => {
							console.error('地址解析失败:', err);
							resolve(null);
						}
					});
				});
			},
			getDrivingRoute(startPos, endPos) {
				return new Promise((resolve, reject) => {
					uni.request({
						url: 'https://restapi.amap.com/v3/direction/driving',
						data: {
							origin: startPos.join(','),
							destination: endPos.join(','),
							key: '9979fdc383e13ee57c582bc869dbd690' // 请替换为您的高德地图API Key
						},
						success: (res) => {
							console.log(res.data.status);
							if (res.data.status === '1') {
								console.log(res.data.route);
								resolve(res.data.route);
							} else {
								console.error('驾车路径规划失败:', res.data.info);
								resolve(null);
							}
						},
						fail: (err) => {
							console.error('驾车路径规划失败:', err);
							resolve(null);
						}
					});
				});
			},
			// 逆地址解析
			transFormAddress(address) {
				return new Promise((resolve, reject) => {
					uni.request({
						url: 'https://restapi.amap.com/v3/geocode/geo',
						data: {
							address: address,
							key: '9979fdc383e13ee57c582bc869dbd690',
							output: 'JSON'
						},
						success: (res) => {
							if(res.data && res.data.info == 'OK') {
								let { geocodes } = res.data;
								let addrArr = geocodes[0].location.split(',')
								resolve([addrArr[0], addrArr[1]]);
							}
						},
						fail: (err) => {
							console.error('逆地址解析失败:', err);
							resolve(null);
						}
					});
				});
			},
			handleButtonClick(trip) {
				if (trip.state === '待支付') {
					this.showPaymentModal = true;
				} else if(trip.state === '待评价'){
					this.applyToJoin(trip.id);
				}
			},
			showRatingModal() {
				this.showRateModal = true;
				this.currentRating = 0;
			},
			setRating(rating) {
				if (this.currentRating === rating) {
					// 如果点击的是当前选中的星星，则取消所有选中
					this.currentRating = 0;
				} else {
					// 否则设置新的评分
					this.currentRating = rating;
				}
			},
			cancelRating() {
				this.showRateModal = false;
			},
			submitRating() {
				// 这里可以发送评价到服务器
				console.log('提交评价:', this.currentRating);
				uni.showToast({
					title: `感谢您的评价: ${this.currentRating}星`,
					icon: 'success'
				});
				this.showRateModal = false;
				
				// 更新订单状态
				this.trips[0].state = '已完成';
			},
			applyToJoin(tripId) {
				// 发送加入请求
			},
			closePaymentModal() {
				this.showPaymentModal = false;
			}
		}
	};
</script>

<style scoped>
	.container {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		border-radius: 20px;
		overflow: hidden;
	}

	.map-container {
		width: 100%;
		height: 400px;
		border-top-left-radius: 20px;
		border-top-right-radius: 20px;
		z-index: 1;
	}

	.order-scroll {
		width: 100%;
		height: calc(100vh - 200px);
		overflow-y: scroll;
	}

	.order-info {
		display: flex;
		flex-direction: column;
		margin: 10px;
	}

	.order-card {
		display: flex;
		flex-direction: column;
		padding: 10px;
		border: 1px solid #ddd;
		border-radius: 10px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		margin-bottom: 10px;
	}

	.order-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.button-container {
		display: flex;
		align-items: center;
	}

	.order-details {
		display: flex;
		flex-direction: column;
		margin-top: 5px;
	}

	.start-point,
	.departure-point {
		display: flex;
		align-items: center;
		margin-bottom: 5px;
	}

	.order-text {
		font-size: 12px;
		margin-left: 5px;
	}

	.price-text {
		font-size: 16px;
		margin-left: 20px;
		color: #003366;
		font-weight: bold;
		align-self: flex-end;
	}

	.separator {
		height: 1px;
		background-color: #ccc;
		margin: 5px 10px;
	}

	.order-summary {
		display: flex;
		align-items: center;
		margin-top: 5px;
	}

	.summary-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}

	.user-avatar {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: 2px solid #007aff;
		margin-right: 10px;
	}

	.car-info {
		display: flex;
		flex-direction: column;
		margin-left: -125px;
	}

	.car-type {
		font-weight: bold;
		font-size: 12px;
	}

	.order-count {
		font-size: 10px;
		color: #999;
	}

	.price-info {
		align-self: flex-end;
	}

	.join-button {
		padding: 3px 10px;
		font-weight: bold;
		font-size: 10px;
		margin-right: 5px;
		background-color: #007aff;
		color: white;
		border: none;
		border-radius: 5px;
	}
	
	.rate-button {
		padding: 3px 10px;
		font-weight: bold;
		font-size: 10px;
		margin-right: 5px;
		background-color: #ff9500;
		color: white;
		border: none;
		border-radius: 5px;
	}
	
	.rate-modal {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}
	
	.rate-content {
		background-color: white;
		padding: 20px;
		border-radius: 10px;
		width: 80%;
		max-width: 300px;
	}
	
	.rate-title {
		font-size: 16px;
		font-weight: bold;
		margin-bottom: 20px;
		display: block;
		text-align: center;
	}
	
	.stars-container {
		display: flex;
		justify-content: center;
		margin-bottom: 20px;
	}
	
	.star {
		margin: 0 5px;
	}
	
	.star-icon {
		width: 30px;
		height: 30px;
	}
	
	.rate-buttons {
		display: flex;
		justify-content: space-between;
	}
	
	.cancel-button {
		flex: 1;
		margin-right: 10px;
		background-color: #f0f0f0;
		color: #333;
	}
	
	.submit-button {
		flex: 1;
		background-color: #007aff;
		color: white;
	}
</style>