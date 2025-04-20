import { get, post, put, del } from '@/utils/request.js';

export const fetchCalendarTrips = (year, month, userId) => {
  return get(`/orders/calendar/${userId}`, { 
    params: { year, month }
  }).then(response => {
    return response.data.map(trip => ({
      id: trip.order_id,
      order_id: trip.order_id,
      start_time: trip.start_time,
      start_loc: trip.start_loc,
      dest_loc: trip.dest_loc,
      date: trip.start_time,
      startPoint: trip.start_loc,
      endPoint: trip.dest_loc,
      price: trip.price,
      car_type: trip.car_type,
      carType: trip.car_type || '未指定车型',
      status: trip.status,
      userAvatar: trip.initiator.avatar || '../../static/user.jpeg',
      orderCount: trip.participants_count || 0,
      initiator: trip.initiator
    }));
  });
};

export function fetchUserTrips(userId) {
  return get( `/orders/user/${userId}/trips`);
}