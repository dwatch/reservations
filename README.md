# Reservations API
The API depends on the IDs of the diners/restaurants/reservations. These IDs are equal to the primary key given to each such object upon creation (out of scope for this takehome). It is assumed that the front-end is able to procure the IDs when using the below 3 endpoints (e.g. diner_ids found when users sign in, restaurant_id found when restaurant is chosen to be booked).

Three endpoints:
 - GetViableRestaurants(diner_ids: [int], start_time: date or date-like str)
 - Reserve(diner_ids: [int], restaurant_id: int, start_time: date or date-like str)
 - Cancel(reservation_id: int)

 GetViableRestaurants - Returns list of all restaurants that cater to the group's dietary restrictions and has seating
 
 Reserve - Returns the reservation ID. Checks beforehand that no one in the group is double-booked
 
 Cancel  - Checks if the current reservation ID exists. If so, then cancels the reservation