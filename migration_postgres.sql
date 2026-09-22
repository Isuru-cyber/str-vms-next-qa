-- =============================================================================
-- STR-VMS Full Supabase PostgreSQL Data Migration Script
-- Converted from MySQL Dump: str_vms_full_backup_2026-09-10_215332.sql
-- =============================================================================

BEGIN;

TRUNCATE TABLE "audit_logs", "activity_logs", "notifications", "trip_reconciliations", "trip_gate_passes", "trip_requests", "delivery_trips", "vehicle_requests", "route_stops", "routes", "drivers", "vehicles", "user_permissions", "user_sub_operations", "user_operations", "user_plants", "users", "locations", "master_data", "mail_templates", "monthly_fuel_rates", "system_settings", "master_categories", "operations", "plants", "roles" CASCADE;

-- -----------------------------------------------------------------------------
-- Table: roles (5 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "roles" ("id", "name", "code", "description") VALUES
  ('1', 'Super Admin', 'SUPER_ADMIN', 'Full unrestricted system access'),
  ('2', 'Admin', 'ADMIN', 'Operational administrator with user & fleet management'),
  ('3', 'Power User', 'POWER_USER', 'Operation and plant allocation lead'),
  ('4', 'Entry User', 'ENTRY_USER', 'Request creation and tracking within assigned scopes'),
  ('5', 'View Only', 'VIEW_USER', 'Read-only visibility for reporting and tracking');

-- -----------------------------------------------------------------------------
-- Table: plants (5 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "plants" ("id", "code", "name", "business_group") VALUES
  ('1', 'STR1', 'Plant STR1', 'ELASTIC'),
  ('2', 'STR2', 'Plant STR2', 'ELASTIC'),
  ('3', 'STR3', 'Plant STR3', 'ELASTIC'),
  ('4', 'YD', 'Plant YD', 'YARN'),
  ('5', 'CP', 'Plant CP', 'YARN');

-- -----------------------------------------------------------------------------
-- Table: operations (2 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "operations" ("id", "code", "name") VALUES
  ('1', 'SHUTTLE', 'Shuttle Operation'),
  ('2', 'FG_OTHER', 'FG & Other');

-- -----------------------------------------------------------------------------
-- Table: master_categories (2 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "master_categories" ("id", "code", "name") VALUES
  ('1', 'SUB_OPERATION', 'Sub Operation'),
  ('2', 'VEHICLE_TYPE', 'Vehicle Type');

-- -----------------------------------------------------------------------------
-- Table: system_settings (13 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "system_settings" ("id", "setting_key", "setting_value") VALUES
  ('1', 'COMPANY_NAME', 'STR Transport Ltd'),
  ('2', 'SYSTEM_NAME', 'Vehicle Management System'),
  ('3', 'DEFAULT_KM_RATE', '150.00'),
  ('4', 'REQUEST_PREFIX', 'REQ-'),
  ('5', 'TRIP_PREFIX', 'TRIP-'),
  ('6', 'SESSION_TIMEOUT_MINUTES', '30'),
  ('7', 'SESSION_TIMEOUT_ALERT_MINUTES', '2'),
  ('8', 'LIMIT_GLOBAL', '100'),
  ('9', 'LIMIT_REQUESTS', '500'),
  ('10', 'LIMIT_ALLOCATIONS', '500'),
  ('11', 'LIMIT_VEHICLES', '0'),
  ('12', 'LIMIT_DRIVERS', '0'),
  ('13', 'LIMIT_LOGS', '2500');

-- -----------------------------------------------------------------------------
-- Table: monthly_fuel_rates (3 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "monthly_fuel_rates" ("id", "period_month", "diesel_rate", "is_locked", "notes", "created_at", "updated_at") VALUES
  ('1', '2026-08', '382.00', '0', 'August 2026 Standard Fuel Rate', '2026-08-21 15:40:11', '2026-08-21 15:40:11'),
  ('2', '2026-07', '380.00', '1', 'July 2026 Locked Fuel Rate', '2026-08-21 15:40:11', '2026-08-21 15:40:11'),
  ('3', '2026-09', '382.00', '0', '', '2026-08-21 16:11:12', '2026-09-08 11:37:54');

-- -----------------------------------------------------------------------------
-- Table: mail_templates (4 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "mail_templates" ("id", "template_key", "name", "description", "subject", "body", "created_at", "updated_at") VALUES
  ('1', 'allocation_confirmed', 'Vehicle Allocation Confirmation', 'Email notification template sent/drafted to requesters when vehicle allocation and trip dispatch is confirmed.', 'Allocation Confirmed: Trip {trip_no} | {vehicle_number} - {route_name}', 'Dear Requester(s),

We are pleased to inform you that your transportation request(s) have been successfully allocated and scheduled for dispatch.


TRIP & ALLOCATION DETAILS
=======================================================
• Trip Number      : {trip_no}
• Allocation Date  : {allocation_date}
• Assigned Route   : {route_name}
• Trip Status      : {status}
• Planned Distance : {planned_km} km


ASSIGNED FLEET & DRIVER DETAILS
=======================================================
• Vehicle Number   : {vehicle_number} ({vehicle_type})
• Driver Name      : {driver_name}
• Contact Mobile   : {driver_mobile}


ALLOCATED REQUESTS BREAKDOWN
=======================================================
{requests_breakdown}


Please ensure all gate passes, loading bays, and personnel are prepared accordingly.
For any inquiries or schedule updates, please contact the Logistics Team', '2026-08-22 14:50:02', '2026-09-09 16:43:10'),
  ('2', 'dispatch_departure_notice', 'Dispatch & Driver Gate-Pass Notification', 'Direct driver and vehicle gate-pass dispatch alert for factory security & loading bays.', '[DISPATCH & GATE PASS] Vehicle {vehicle_number} | Trip #{trip_no} ({route_name})', 'GATE PASS & DISPATCH CLEARANCE NOTICE

Driver: {driver_name} (NIC: {driver_nic})
Vehicle: {vehicle_number}
Route: {route_name}

Requests:
{requests_breakdown}

STR Logistics Control', '2026-08-22 14:56:50', '2026-08-22 15:02:26'),
  ('3', 'request_rejected', 'Request Rejection Notice', 'Dispatched when Central Fleet Dispatch rejects a vehicle request', '[STR VMS] Action Required: Vehicle Request {request_code} Rejected', 'Dear {requester_name},

Please be informed that your Vehicle Transport Request {request_code} has been REJECTED by Central Fleet Dispatch.

Request Details:
- Request ID: {request_code}
- Plant: {plant_name}
- Route: {from_location} -> {to_location}
- Cargo / Item: {item_description}
- Required Date: {required_date} {required_time}
- Reason for Rejection: {rejection_reason}

Next Steps:
Please revise your schedule or contact the Central Fleet Dispatch team if an urgent alternative arrangement is required.

Best regards,
Central Fleet Dispatch Management
STR Logistics Department', '2026-08-22 22:53:41', '2026-08-22 22:53:41'),
  ('4', 'request_cancelled', 'Request Cancellation Notice', 'Dispatched when a vehicle request is cancelled by requester or plant', '[STR VMS] Notice: Vehicle Request {request_code} Cancelled', 'Dear {requester_name},

Vehicle Transport Request {request_code} has been CANCELLED.

Request Details:
- Request ID: {request_code}
- Plant: {plant_name}
- Route: {from_location} -> {to_location}
- Cargo / Item: {item_description}
- Cancellation Reason: {cancellation_reason}

Best regards,
STR Logistics Operations', '2026-08-22 22:53:41', '2026-08-22 22:53:41');

-- -----------------------------------------------------------------------------
-- Table: master_data (20 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "master_data" ("id", "category_id", "code", "name", "default_fuel_consumption", "default_running_cost_per_km", "default_profit_per_km", "default_fixed_cost_per_day", "sort_order", "active") VALUES
  ('1', '1', 'RM', 'Raw Material', NULL, NULL, '15.00', '1795.36', '1', '1'),
  ('2', '1', 'FG', 'Finished Goods', NULL, NULL, '15.00', '1795.36', '2', '1'),
  ('3', '1', 'DYE_CHE', 'Dyes & Chemicals', NULL, NULL, '15.00', '1795.36', '3', '1'),
  ('4', '1', 'MACHINERY', 'Machinery', NULL, NULL, '15.00', '1795.36', '4', '1'),
  ('5', '1', 'MAINTENANCE', 'Maintenance', NULL, NULL, '15.00', '1795.36', '5', '1'),
  ('6', '1', 'GREIGE', 'Greige', NULL, NULL, '15.00', '1795.36', '6', '1'),
  ('7', '1', 'SAMPLE', 'Sample', NULL, NULL, '15.00', '1795.36', '7', '1'),
  ('8', '1', 'OTHER', 'Other', NULL, NULL, '15.00', '1795.36', '8', '1'),
  ('17', '2', '8.5_FT', '8.5 ft', '18.00', '18.07', '15.00', '1795.36', '1', '1'),
  ('18', '2', '8.5_FT_DB', '8.5 ft - DB', '10.00', '18.07', '15.00', '1795.36', '2', '1'),
  ('19', '2', '9.5_FT', '9.5 ft', '14.00', '20.50', '15.00', '1795.36', '3', '1'),
  ('20', '2', '10_FT', '10 ft', '10.00', '20.50', '15.00', '1795.36', '4', '1'),
  ('21', '2', '10.5_FT', '10.5 ft', '10.00', '20.50', '15.00', '1795.36', '5', '1'),
  ('22', '2', '12.5_FT', '12.5 ft', '8.00', '20.50', '15.00', '1795.36', '6', '1'),
  ('23', '2', '14.5_FT', '14.5 ft', '8.00', '27.02', '15.00', '1795.36', '7', '1'),
  ('24', '2', '16.5_FT', '16.5 ft', '8.00', '27.02', '15.00', '1795.36', '8', '1'),
  ('25', '2', '18.50_FT', '18.50 ft', '7.00', '27.02', '15.00', '1795.36', '9', '1'),
  ('26', '2', '20_FT', '20 ft', '5.00', '27.02', '15.00', '1995.35', '10', '1'),
  ('27', '2', '40_FT', '40 ft', '2.00', '32.00', '15.00', '2500.00', '11', '1'),
  ('30', '2', '40_FT___HC', '40 ft - HC', '1.50', '35.00', '15.00', '1795.36', '99', '1');

-- -----------------------------------------------------------------------------
-- Table: locations (55 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "locations" ("id", "location_name", "business_group", "display_name", "code", "location_type", "plant_id", "customer_id", "contact_person", "contact_number", "latitude", "longitude", "address", "active", "created_at", "updated_at", "is_origin") VALUES
  ('10', 'BENJI BINGIRIYA', 'ELASTIC', '', 'B00009-T', 'CUSTOMER', NULL, NULL, '', '', '7.32800000', '80.02410000', '', '1', '2026-08-19 19:23:56', '2026-09-09 16:20:24', '0'),
  ('38', 'EXPO KADANA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', '7.04250000', '79.89700000', NULL, '1', '2026-08-19 19:23:56', '2026-09-06 15:32:48', '0'),
  ('94', 'RM RUSALU KATANA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', '7.20600000', '79.88500000', NULL, '1', '2026-08-19 19:23:56', '2026-09-06 15:32:48', '0'),
  ('98', 'SIRIO BADALGAMA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', '7.25800000', '79.98000000', NULL, '1', '2026-08-19 19:23:56', '2026-09-06 15:32:48', '0'),
  ('100', 'SLIMLINE PANNALA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', '7.36000000', '80.05500000', NULL, '1', '2026-08-19 19:23:56', '2026-09-06 15:32:48', '0'),
  ('124', 'STR 1 - BIYAGAMA', 'ELASTIC', NULL, '', 'PLANT', '1', NULL, '', '', '6.98000000', '79.99000000', '', '1', '2026-08-19 19:24:22', '2026-09-06 15:32:48', '1'),
  ('151', 'CP - BIYAGAMA', 'YARN', NULL, '', 'PLANT', '5', NULL, '', '', '6.98300000', '79.99300000', NULL, '1', '2026-08-20 17:51:57', '2026-09-06 15:32:48', '1'),
  ('152', 'YD - BIYAGAMA', 'YARN', NULL, '', 'PLANT', '4', NULL, '', '', '6.97700000', '79.98700000', NULL, '1', '2026-08-20 17:51:57', '2026-09-06 15:32:48', '1'),
  ('153', 'STR 2 - MT LAVINIA', 'ELASTIC', NULL, '', 'PLANT', '2', NULL, '', '', '6.83740000', '79.86600000', NULL, '1', '2026-08-20 17:51:57', '2026-09-06 15:32:48', '1'),
  ('154', 'STR 3 - MILLANIYA', 'ELASTIC', NULL, '', 'PLANT', '3', NULL, '', '', '7.49557920', '80.37837993', '', '1', '2026-08-20 17:51:57', '2026-09-06 15:32:48', '1'),
  ('155', 'BNS 3PL - PATTIVILA', 'ELASTIC', NULL, '', 'WAREHOUSE', NULL, NULL, '', '', '6.97300000', '80.00500000', NULL, '1', '2026-08-20 18:01:08', '2026-09-06 15:32:48', '1'),
  ('159', 'ATG LANKA - WATHUPITIWALA', 'YARN', NULL, '', 'CUSTOMER', NULL, NULL, '', '', '7.12346300', '80.10361400', '', '1', '2026-08-21 15:56:44', '2026-09-06 15:32:48', '0'),
  ('160', 'BNS 3PL - PATTIVILA WH', 'YARN', NULL, '', 'WAREHOUSE', NULL, NULL, '', '', '7.03582600', '79.99188800', '', '1', '2026-08-21 16:11:42', '2026-09-06 15:32:48', '0'),
  ('162', 'UNICHELA - MILKRUN', 'ELASTIC', NULL, 'M00028-T', 'CUSTOMER', NULL, NULL, '', '', '7.29093351', '80.63277557', '', '1', '2026-08-24 17:21:53', '2026-09-06 15:32:48', '0'),
  ('163', 'HORANA BODYLINE', 'ELASTIC', 'BODYLINE HORANA', '', 'CUSTOMER', NULL, NULL, '', '', '6.73174320', '80.10573220', 'BODYLINE (PVT) LTD, Ratnapura Road, Horana 12400', '1', '2026-09-01 09:02:06', '2026-09-01 09:02:06', '0'),
  ('164', 'EFL - PELIYAGODA (KREEDA)', 'ELASTIC', 'EFL - PELIYAGODA (KREEDA)', '', 'WAREHOUSE', NULL, NULL, '', '', '6.95945366', '79.88768065', 'No. 81/1, 3rd Lane, Gongalegoda Banda Raja Mw., Peliyagoda', '1', '2026-09-01 09:05:34', '2026-09-08 13:10:58', '0'),
  ('165', 'EFL KANDANA (KREEDA)', 'ELASTIC', 'EFL KANDANA (KREEDA)', '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '370A, Nugape Junction Bopitiya, Uswetakeiyawa 11328', '1', '2026-09-01 09:06:32', '2026-09-08 13:11:18', '0'),
  ('166', 'UNICHELA PANADURA', 'ELASTIC', 'UNICHELA PANADURA', '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-01 09:09:17', '2026-09-01 09:09:17', '0'),
  ('167', 'MDS RATMALANA', 'ELASTIC', 'MDS RATMALANA', '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-01 09:09:48', '2026-09-01 09:09:48', '0'),
  ('168', 'INTIMO BIYAGAMA', 'ELASTIC', 'INTIMO BIYAGAMA', '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-01 09:10:22', '2026-09-01 09:10:22', '0'),
  ('169', 'Mearsk Yard - Wattala', 'ELASTIC', 'Mearsk Yard - Wattala', '', 'WAREHOUSE', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-01 09:10:44', '2026-09-06 15:32:48', '0'),
  ('170', 'MAS Fabrics Thulhiriya', 'ELASTIC', 'MAS Fabrics Thulhiriya', '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-01 09:10:58', '2026-09-01 09:10:58', '0'),
  ('171', 'OMEGALINE SANDALANKAWA', 'ELASTIC', 'OMEGALINE SANDALANKAWA', '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-01 09:11:12', '2026-09-01 09:11:12', '0'),
  ('172', 'UNICHELA MILK RUN - SCANWELL', 'ELASTIC', 'UNICHELA MILK RUN - SCANWELL', '', 'WAREHOUSE', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-01 09:11:46', '2026-09-01 09:11:46', '0'),
  ('173', 'RM HOLDING - KATANA', 'ELASTIC', 'RM HOLDING (RUSALU) - KATANA', '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('174', 'SIMTEX KULIYAPITIYA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, 'Dehiaththakandiya', '1', '2026-09-05 16:01:33', '2026-09-06 15:32:48', '0'),
  ('175', 'KOGGALA UNICHELA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('176', 'KOGGALA BRANDIX', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('177', 'WACOAL WATHUPITIWALA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('178', 'BRANDIX (BLI) WATHUPITIWALA', 'ELASTIC', '', 'B00027-T', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-09 16:22:14', '0'),
  ('179', 'CRYSTAL MARTIN WATHUPITIWALA', 'ELASTIC', '', 'C00045-T', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-09 16:25:01', '0'),
  ('180', 'BRANDIX MINUWANGODA', 'ELASTIC', '', 'B00027-T', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-09 16:22:23', '0'),
  ('181', 'INQUBE - ADVANTIS KOTUGODA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('182', 'BRANDIX - ADVANTIS KOTUGODA', 'ELASTIC', '', 'B00027-T', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-09 16:21:53', '0'),
  ('183', 'LINEA CLOTHING PALLEKALE', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('184', 'CONTURLINE - PALLEKELE', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('185', 'EMJAY PANWILA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('186', 'EMJAY KURUNEGALA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('187', 'EMJAY THELDENIYA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('188', 'OMEGALINE - VAVNIYA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('189', 'HIRDARAMANI - KAHATHUDUWA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('190', 'HIRDARAMANI - VAVNIYA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('191', 'Triple Safety - Ambalanthota', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('192', 'SYNERGY AWISSAWELLA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('193', 'SLIMLINE PANNALA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('194', 'TBS - Wanaluwawa', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('195', 'LINEA AQUA GIRIDARA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('196', 'NARAMMALA - JINADASA', 'ELASTIC', NULL, '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('197', 'STR 2 MOUNT LAVINIA', 'INTERNAL', NULL, '', 'INTERNAL', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-06 15:32:48', '0'),
  ('198', 'CRYSTAL MARTIN MALWATTA', 'ELASTIC', '', 'C00046-T', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-09 16:24:47', '0');
INSERT INTO "locations" ("id", "location_name", "business_group", "display_name", "code", "location_type", "plant_id", "customer_id", "contact_person", "contact_number", "latitude", "longitude", "address", "active", "created_at", "updated_at", "is_origin") VALUES
  ('199', 'BRANDIX MIRIGAMA', 'ELASTIC', '', 'B00027-T', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-06 15:32:48', '2026-09-09 16:22:33', '0'),
  ('202', 'BRANDIX - AVISSAWELLA', 'ELASTIC', 'BRANDIX - AVISSAWELLA', 'B00027-T', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-08 12:52:29', '2026-09-09 16:22:04', '0'),
  ('203', 'ALPHA POLGAHAWELA', 'ELASTIC', 'ALPHA POLGAHAWELA', '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, 'ALPHA APPARELS LTD
LOT 5 -7 , E.P.Z.,
POLGAHAWELA', '1', '2026-09-10 13:39:35', '2026-09-10 13:39:35', '0'),
  ('204', 'CRYSTAL MARTIN KATUNAYAKE', 'ELASTIC', 'CRYSTAL MARTIN KATUNAYAKE', '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, '', '1', '2026-09-10 13:50:15', '2026-09-10 13:50:15', '0'),
  ('205', 'STEWARTS LANKA - BANDARAGAMA', 'ELASTIC', 'STEWARTS LANKA - BANDARAGAMA', '', 'CUSTOMER', NULL, NULL, '', '', NULL, NULL, 'STEWARTS LANKA - BANDARAGAMA', '1', '2026-09-10 15:56:18', '2026-09-10 15:56:18', '0');

-- -----------------------------------------------------------------------------
-- Table: users (10 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "users" ("id", "user_code", "name", "email", "password", "role_id", "theme_preference", "sidebar_hidden_items", "active", "created_at") VALUES
  ('1', 'USR-0001', 'Isuru Ranasinghe', 'superadmin@str.com', '$2y$10$TRj1c3gSZXsoXy0ndoLVBeXEOm03zZOezxv5WP2eV55CUpC8OrxIe', '1', 'light', '["alloc_shuttle","alloc_shuttle_combine","map"]', '1', '2026-08-19 22:33:56'),
  ('2', 'USR-0002', 'Logistics Admin', 'deleted_1788809948_logistics.admin@str.com', '$2y$10$TRj1c3gSZXsoXy0ndoLVBeXEOm03zZOezxv5WP2eV55CUpC8OrxIe', '2', 'light', NULL, '0', '2026-08-19 22:33:56'),
  ('3', 'USR-0003', 'Dispatcher STR (Planner)', 'deleted_1788809953_dispatcher@str.com', '$2y$10$TRj1c3gSZXsoXy0ndoLVBeXEOm03zZOezxv5WP2eV55CUpC8OrxIe', '3', 'light', NULL, '0', '2026-08-19 22:33:56'),
  ('4', 'USR-0004', 'Plant Requester (STR1)', 'deleted_1788809955_requester.str1@str.com', '$2y$10$TRj1c3gSZXsoXy0ndoLVBeXEOm03zZOezxv5WP2eV55CUpC8OrxIe', '4', 'light', NULL, '0', '2026-08-19 22:33:56'),
  ('5', 'USR-0005', 'Management Auditor', 'deleted_1788809958_auditor@str.com', '$2y$10$TRj1c3gSZXsoXy0ndoLVBeXEOm03zZOezxv5WP2eV55CUpC8OrxIe', '5', 'light', NULL, '0', '2026-08-19 22:33:56'),
  ('6', 'USR-0006', 'Susith Fernando', 'susithf@stretchline.com', '$2y$10$/wZ7S5.Bqf.zpHogiI4Tx.3AMe4kThcbMpTGmqTbivVyiWKxVcXvy', '1', 'material', NULL, '1', '2026-09-08 01:09:45'),
  ('7', 'USR-0007', 'Ravihari Thennakoon', 'raviharit@stretchline.com', '$2y$10$/YELomHYLQW069lFvFarHu5PPCPr9sgR.NdQztrVsjAoiheoFxk4O', '4', 'material', NULL, '1', '2026-09-08 08:43:46'),
  ('8', 'USR-0008', 'Andrew Kristy', 'andrewk@stretchline.com', '$2y$10$NXRtwvmEsJEqhErIFLFnUO8vk4GnbZVxynEF622oY.ylYq8bfR2.a', '4', 'material', NULL, '1', '2026-09-08 08:45:07'),
  ('9', 'USR-0009', 'Kasun Sirimanna', 'kasunsi@stretchline.com', '$2y$10$x1WHQSYx8iHFtPxqLni/d.I3MCITWaJyS6tjY4nTDvndnWarR8CYu', '4', 'material', NULL, '1', '2026-09-08 10:39:15'),
  ('10', 'USR-0010', 'Saniru Kalmitha', 'saniruk@stretchline.com', '$2y$10$/tikT7xKDPmqltxvAwYnxOe0fPo5m6djte9/G1LkTCYDjIqiKCQnS', '4', 'material', NULL, '1', '2026-09-08 10:40:19');

-- -----------------------------------------------------------------------------
-- Table: user_plants (25 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "user_plants" ("user_id", "plant_id") VALUES
  ('1', '1'),
  ('7', '1'),
  ('8', '1'),
  ('9', '1'),
  ('10', '1'),
  ('1', '2'),
  ('7', '2'),
  ('8', '2'),
  ('9', '2'),
  ('10', '2'),
  ('1', '3'),
  ('7', '3'),
  ('8', '3'),
  ('9', '3'),
  ('10', '3'),
  ('1', '4'),
  ('7', '4'),
  ('8', '4'),
  ('9', '4'),
  ('10', '4'),
  ('1', '5'),
  ('7', '5'),
  ('8', '5'),
  ('9', '5'),
  ('10', '5');

-- -----------------------------------------------------------------------------
-- Table: user_operations (6 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "user_operations" ("user_id", "operation_id") VALUES
  ('1', '1'),
  ('1', '2'),
  ('7', '2'),
  ('8', '2'),
  ('9', '2'),
  ('10', '2');

-- -----------------------------------------------------------------------------
-- Table: user_sub_operations (40 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "user_sub_operations" ("user_id", "sub_operation_id") VALUES
  ('1', '1'),
  ('1', '2'),
  ('1', '3'),
  ('1', '4'),
  ('1', '5'),
  ('1', '6'),
  ('1', '7'),
  ('1', '8'),
  ('7', '1'),
  ('7', '2'),
  ('7', '3'),
  ('7', '4'),
  ('7', '5'),
  ('7', '6'),
  ('7', '7'),
  ('7', '8'),
  ('8', '1'),
  ('8', '2'),
  ('8', '3'),
  ('8', '4'),
  ('8', '5'),
  ('8', '6'),
  ('8', '7'),
  ('8', '8'),
  ('9', '1'),
  ('9', '2'),
  ('9', '3'),
  ('9', '4'),
  ('9', '5'),
  ('9', '6'),
  ('9', '7'),
  ('9', '8'),
  ('10', '1'),
  ('10', '2'),
  ('10', '3'),
  ('10', '4'),
  ('10', '5'),
  ('10', '6'),
  ('10', '7'),
  ('10', '8');

-- -----------------------------------------------------------------------------
-- Table: user_permissions (13 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "user_permissions" ("id", "user_id", "permission_key", "created_at") VALUES
  ('53', '1', 'view_dashboard', '2026-08-23 17:35:45'),
  ('54', '1', 'view_analytics', '2026-08-23 17:35:45'),
  ('55', '1', 'create_requests', '2026-08-23 17:35:45'),
  ('56', '1', 'dispatch_trips', '2026-08-23 17:35:45'),
  ('57', '1', 'manage_fleet', '2026-08-23 17:35:45'),
  ('58', '1', 'view_map', '2026-08-23 17:35:45'),
  ('59', '1', 'manage_users', '2026-08-23 17:35:45'),
  ('75', '6', 'create_requests', '2026-09-08 01:09:45'),
  ('77', '8', 'create_requests', '2026-09-08 08:45:07'),
  ('80', '9', 'create_requests', '2026-09-08 10:39:15'),
  ('81', '10', 'create_requests', '2026-09-08 10:40:19'),
  ('84', '7', 'create_requests', '2026-09-09 10:52:01'),
  ('85', '7', 'dispatch_audit', '2026-09-09 10:52:01');

-- -----------------------------------------------------------------------------
-- Table: vehicles (25 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "vehicles" ("id", "vehicle_number", "vehicle_type", "operation_category_id", "max_payload_kg", "max_volume_cbm", "default_location_id", "payment_basis", "monthly_km_limit", "status", "active_from", "remarks", "active", "fuel_consumption_kml", "running_cost_per_km", "profit_per_km", "fixed_cost_per_day", "monthly_fixed_rate", "extra_km_rate") VALUES
  ('1', 'PY-3548', '8.5 ft', '2', '800.00', '3.50', '124', 'KM_BASED', '3000', 'ALLOCATED', NULL, NULL, '1', '18.00', '18.07', '15.00', '1795.36', '180000.00', '75.00'),
  ('2', 'PP-9565', '8.5 ft', '2', '800.00', '3.50', NULL, 'KM_BASED', '3000', 'AVAILABLE', NULL, NULL, '1', '18.00', '18.07', '15.00', '1795.36', '0.00', '0.00'),
  ('3', 'DAB -0669', '8.5 ft', '2', '800.00', '3.50', '124', 'KM_BASED', '3000', 'ALLOCATED', NULL, NULL, '1', '18.00', '18.07', '15.00', '1795.36', '180000.00', '75.00'),
  ('4', 'DAE-9329', '8.5 ft', '2', '800.00', '12.00', '153', 'KM_BASED', '3000', 'ALLOCATED', NULL, NULL, '1', '18.00', '18.07', '15.00', '1795.36', '0.00', '0.00'),
  ('5', 'GN-4557', '9.5 ft', '2', '1000.00', '6.00', '124', 'KM_BASED', '3000', 'ALLOCATED', NULL, NULL, '1', '10.00', '20.50', '15.00', '1795.36', '180000.00', '75.00'),
  ('6', '68-3470', '10.5 ft', '2', '1200.00', '15.00', '124', 'KM_BASED', '3000', 'AVAILABLE', NULL, NULL, '1', '10.00', '20.50', '15.00', '1795.36', '0.00', '0.00'),
  ('7', 'GB-6111', '10.5 ft', '2', '1500.00', '15.00', '124', 'KM_BASED', '3000', 'ALLOCATED', NULL, NULL, '1', '10.00', '20.50', '15.00', '1795.36', '180000.00', '75.00'),
  ('8', '227-3502', '10.5 ft', '2', '1500.00', '15.00', '124', 'KM_BASED', '3000', 'ALLOCATED', NULL, NULL, '1', '10.00', '20.50', '15.00', '1795.36', '0.00', '0.00'),
  ('9', 'LK-6471', '10.5 ft', '1', '2000.00', '15.00', '124', 'FIXED', '1000', 'ALLOCATED', NULL, NULL, '1', '10.00', '20.50', '15.00', '1795.36', '314109.73', '113.44'),
  ('10', 'GE-5975', '14.5 ft', '2', '2200.00', '18.00', '124', 'KM_BASED', '3000', 'ALLOCATED', NULL, NULL, '1', '8.00', '27.02', '15.00', '1795.36', '180000.00', '75.00'),
  ('11', '42-5765', '14.5 ft', '2', '1800.00', '20.00', '124', 'KM_BASED', '3000', 'AVAILABLE', NULL, NULL, '1', '8.00', '27.02', '15.00', '1795.36', '0.00', '0.00'),
  ('12', '47-1911', '14.5 ft', '2', '1800.00', '20.00', NULL, 'KM_BASED', '3000', 'ALLOCATED', NULL, NULL, '1', '8.00', '27.02', '15.00', '1795.36', '180000.00', '75.00'),
  ('13', '48-1015', '14.5 ft', '2', '2500.00', '20.00', '124', 'KM_BASED', '3000', 'AVAILABLE', NULL, NULL, '1', '8.00', '27.02', '15.00', '1795.36', '0.00', '0.00'),
  ('14', '227-7072', '14.5 ft', '2', '2500.00', '20.00', '124', 'KM_BASED', '3000', 'ALLOCATED', NULL, NULL, '1', '8.00', '27.02', '15.00', '1795.36', '180000.00', '75.00'),
  ('15', 'LM-1621', '14.5 ft', '2', '2000.00', '20.00', '153', 'FIXED', '2500', 'ALLOCATED', NULL, NULL, '1', '8.00', '27.02', '15.00', '1795.36', '296235.77', '77.47'),
  ('16', '47-9845', '16.5 ft', '2', '2500.00', '25.00', '124', 'FIXED', '1500', 'AVAILABLE', NULL, NULL, '1', '8.00', '27.02', '15.00', '1795.36', '331289.00', '113.24'),
  ('17', 'LL-0980', '20 ft', '1', '3000.00', '30.00', NULL, 'KM_BASED', '3000', 'AVAILABLE', NULL, NULL, '1', '5.00', '27.02', '15.00', '1995.35', '0.00', '0.00'),
  ('18', 'LF-8144', '20 ft', '1', '3000.00', '30.00', NULL, 'KM_BASED', '3000', 'AVAILABLE', NULL, NULL, '1', '5.00', '27.02', '15.00', '1995.35', '0.00', '0.00'),
  ('19', 'LL-1603', '16.5 ft', '1', '2000.00', '10.00', '124', 'FIXED', '1000', 'AVAILABLE', NULL, NULL, '1', '8.00', '27.02', '15.00', '1795.36', '348102.56', '126.41'),
  ('21', 'LK-5347', '14.5 ft', '1', '2000.00', '15.00', '124', 'FIXED', '1000', 'AVAILABLE', NULL, NULL, '1', '8.00', '27.02', '15.00', '1795.36', '314110.00', '113.44'),
  ('22', '42-9577', '14.5 ft', '1', '2000.00', '15.00', '124', 'FIXED', '1000', 'AVAILABLE', NULL, NULL, '1', '8.00', '27.02', '15.00', '1795.36', '314109.73', '113.44'),
  ('23', '227-0834', '14.5 ft', '1', '2000.00', '15.00', '124', 'FIXED', '1000', 'AVAILABLE', NULL, NULL, '1', '8.00', '27.02', '15.00', '1795.36', '314109.73', '113.44'),
  ('24', 'GP-0137', '14.5 ft', '1', '2000.00', '15.00', '124', 'FIXED', '1000', 'AVAILABLE', NULL, NULL, '1', '8.00', '27.02', '15.00', '1795.36', '314109.73', '113.44'),
  ('25', '42-1579', '14.5 ft', '1', '2000.00', '15.00', '124', 'FIXED', '1000', 'AVAILABLE', NULL, NULL, '1', '8.00', '27.02', '15.00', '1795.36', '314109.73', '113.44'),
  ('26', 'LK-0311', '14.5 ft', '1', '2000.00', '15.00', '124', 'FIXED', '1000', 'AVAILABLE', NULL, NULL, '1', '8.00', '27.02', '15.00', '1795.36', '314109.73', '113.44');

-- -----------------------------------------------------------------------------
-- Table: drivers (20 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "drivers" ("id", "name", "nic", "mobile", "license_number", "license_expiry", "linked_vehicle_id", "linked_plant_id", "status", "remarks", "active") VALUES
  ('1', 'Shantha', '9732608170V', '779455099', 'B141180', '2027-01-30', '1', NULL, 'ON_TRIP', NULL, '1'),
  ('2', 'Srimal', '8719147171V', '778620905', 'B249380', '2028-07-20', '2', NULL, 'AVAILABLE', NULL, '1'),
  ('3', 'Nishantha', '6681716462V', '741506556', 'B160851', '2027-02-17', '3', NULL, 'ON_TRIP', NULL, '1'),
  ('4', 'Alwis', '7819812743V', '741683037', 'B863246', '2027-02-11', '4', NULL, 'ON_TRIP', NULL, '1'),
  ('5', 'Kumara', '9732608174V', '763572716', 'B625288', '2027-06-18', '5', NULL, 'ON_TRIP', NULL, '1'),
  ('6', 'Wijethunga', '8791914715V', '772389000', 'B380818', '2027-05-05', '6', NULL, 'AVAILABLE', NULL, '1'),
  ('7', 'Viraj', '6678171646V', '740152728', 'B045675', '2027-08-08', '7', NULL, 'ON_TRIP', NULL, '1'),
  ('8', 'Senapala', '7819127477V', '774233996', 'B816423', '2027-05-11', '8', NULL, 'ON_TRIP', NULL, '1'),
  ('9', 'Manjula', '9373260818V', '762452721', 'B513003', '2027-04-05', '9', NULL, 'ON_TRIP', NULL, '1'),
  ('10', 'Layanal', '8761914719V', '741864707', 'B450624', '2027-07-07', '10', NULL, 'ON_TRIP', NULL, '1'),
  ('11', 'Layanal', '68171646110V', '788080580', 'B778044', '2027-02-28', '11', NULL, 'AVAILABLE', NULL, '1'),
  ('12', 'Gnanasiri', '78112747111V', '701756050', 'B449163', '2028-06-16', '12', NULL, 'ON_TRIP', NULL, '1'),
  ('13', 'Chaminda', '97328608112V', '771931576', 'B288467', '2028-05-05', '13', NULL, 'AVAILABLE', NULL, '1'),
  ('14', 'Kumara', '87191479113V', '779763472', 'B033860', '2027-09-18', '14', NULL, 'ON_TRIP', NULL, '1'),
  ('15', 'Sajith', '66817016414V', '725619723', 'B347559', '2026-10-28', '15', NULL, 'ON_TRIP', NULL, '1'),
  ('16', 'Ranasinghe', '78197127415V', '771642429', 'B213400', '2028-02-06', '16', NULL, 'AVAILABLE', NULL, '1'),
  ('17', 'Gayan', '97302608116V', '763195252', 'B840941', '2027-07-21', '17', NULL, 'AVAILABLE', NULL, '1'),
  ('18', 'Isuru', '87169147117V', '769147471', 'B028300', '2026-10-03', '18', NULL, 'AVAILABLE', NULL, '1'),
  ('19', 'Ranasinghe', '68681716418V', '779193471', 'B296302', '2028-03-25', '19', NULL, 'AVAILABLE', NULL, '1'),
  ('20', 'Isuru M Ranasinghe', '123456789', '2345678', '3245678', '2027-04-30', '25', NULL, 'AVAILABLE', NULL, '1');

-- -----------------------------------------------------------------------------
-- Table: routes (49 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "routes" ("id", "route_code", "route_name", "business_group", "operation_type", "origin_location_id", "total_distance_km", "route_group", "active", "remarks", "created_at", "updated_at") VALUES
  ('1', 'RTE-0001', 'STR 1 - BIYAGAMA -> KOGGALA UNICHELA', 'ELASTIC', 'FG_OTHER', '124', '265.00', NULL, '1', '', '2026-09-08 10:21:06', '2026-09-08 10:21:06'),
  ('2', 'RTE-0002', 'STR 1 - BIYAGAMA -> STR 2 - MT LAVINIA', 'ELASTIC', 'FG_OTHER', '124', '62.00', NULL, '1', 'Empty run from EP to STR 2 - LC Ctns collection', '2026-09-08 11:33:58', '2026-09-08 11:33:58'),
  ('3', 'RTE-0003', 'STR 1 - BIYAGAMA -> LINEA CLOTHING PALLEKALE', 'ELASTIC', 'FG_OTHER', '124', '239.00', NULL, '1', '', '2026-09-08 13:14:54', '2026-09-08 13:14:54'),
  ('4', 'RTE-0004', 'STR 2 - MT LAVINIA -> BRANDIX - AVISSAWELLA -> SYNERGY AWISSAWELLA', 'ELASTIC', 'FG_OTHER', '153', '98.00', NULL, '1', '', '2026-09-08 13:28:45', '2026-09-08 13:28:45'),
  ('5', 'RTE-0005', 'STR 2 - MT LAVINIA -> BRANDIX - AVISSAWELLA', 'ELASTIC', 'FG_OTHER', '153', '48.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0004', '2026-09-08 13:28:45', '2026-09-08 13:28:45'),
  ('6', 'RTE-0006', 'STR 2 - MT LAVINIA -> SYNERGY AWISSAWELLA', 'ELASTIC', 'FG_OTHER', '153', '48.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0004', '2026-09-08 13:28:45', '2026-09-08 13:28:45'),
  ('7', 'RTE-0007', 'STR 2 - MT LAVINIA -> BENJI BINGIRIYA -> BRANDIX (BLI) WATHUPITIWALA', 'ELASTIC', 'FG_OTHER', '153', '224.00', NULL, '1', 'Back to EP', '2026-09-08 14:22:28', '2026-09-08 14:22:28'),
  ('8', 'RTE-0008', 'STR 2 - MT LAVINIA -> BENJI BINGIRIYA', 'ELASTIC', 'FG_OTHER', '153', '190.00', NULL, '1', 'Direct route auto-generated from RTE-0007', '2026-09-08 14:22:28', '2026-09-10 15:37:34'),
  ('9', 'RTE-0009', 'STR 2 - MT LAVINIA -> BRANDIX (BLI) WATHUPITIWALA', 'ELASTIC', 'FG_OTHER', '153', '114.00', NULL, '1', 'Direct route auto-generated from RTE-0007', '2026-09-08 14:22:28', '2026-09-10 15:46:27'),
  ('10', 'RTE-0010', 'STR 2 - MT LAVINIA -> STR 1 - BIYAGAMA', 'ELASTIC', 'FG_OTHER', '153', '62.00', NULL, '1', '', '2026-09-08 14:29:30', '2026-09-08 14:29:30'),
  ('11', 'RTE-0011', 'STR 1 - BIYAGAMA -> HORANA BODYLINE', 'ELASTIC', 'FG_OTHER', '124', '88.00', NULL, '1', '', '2026-09-08 14:33:57', '2026-09-08 14:33:57'),
  ('12', 'RTE-0012', 'STR 1 - BIYAGAMA -> BRANDIX - ADVANTIS KOTUGODA', 'ELASTIC', 'FG_OTHER', '124', '69.00', NULL, '1', '', '2026-09-08 14:37:14', '2026-09-08 14:37:14'),
  ('13', 'RTE-0013', 'STR 1 - BIYAGAMA -> SYNERGY AWISSAWELLA -> BRANDIX - AVISSAWELLA', 'ELASTIC', 'FG_OTHER', '124', '68.00', NULL, '1', '', '2026-09-08 15:25:03', '2026-09-08 15:25:03'),
  ('14', 'RTE-0014', 'STR 1 - BIYAGAMA -> SYNERGY AWISSAWELLA', 'ELASTIC', 'FG_OTHER', '124', '68.00', NULL, '1', 'Direct route auto-generated from RTE-0013', '2026-09-08 15:25:03', '2026-09-10 12:46:27'),
  ('15', 'RTE-0015', 'STR 1 - BIYAGAMA -> BRANDIX - AVISSAWELLA', 'ELASTIC', 'FG_OTHER', '124', '33.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0013', '2026-09-08 15:25:03', '2026-09-08 15:25:03'),
  ('16', 'RTE-0016', 'STR 1 - BIYAGAMA -> EXPO KADANA -> NARAMMALA - JINADASA', 'ELASTIC', 'FG_OTHER', '124', '156.00', NULL, '1', 'BACK TO EP', '2026-09-08 15:36:14', '2026-09-08 15:36:14'),
  ('17', 'RTE-0017', 'STR 1 - BIYAGAMA -> EXPO KADANA', 'ELASTIC', 'FG_OTHER', '124', '53.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0016', '2026-09-08 15:36:14', '2026-09-08 15:36:14'),
  ('18', 'RTE-0018', 'STR 1 - BIYAGAMA -> NARAMMALA - JINADASA', 'ELASTIC', 'FG_OTHER', '124', '149.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0016', '2026-09-08 15:36:14', '2026-09-08 15:36:14'),
  ('19', 'RTE-0019', 'STR 1 - BIYAGAMA -> EFL - PELIYAGODA (KREEDA)', 'ELASTIC', 'FG_OTHER', '124', '40.00', NULL, '1', '', '2026-09-09 07:50:27', '2026-09-09 07:50:27'),
  ('20', 'RTE-0020', 'STR 1 - BIYAGAMA -> UNICHELA MILK RUN - SCANWELL', 'ELASTIC', 'FG_OTHER', '124', '46.00', NULL, '1', '', '2026-09-09 08:54:02', '2026-09-09 08:54:02'),
  ('21', 'RTE-0021', 'STR 1 - BIYAGAMA -> SIRIO BADALGAMA', 'ELASTIC', 'FG_OTHER', '124', '104.00', NULL, '1', '', '2026-09-09 10:11:41', '2026-09-09 10:11:41'),
  ('22', 'RTE-0022', 'STR 1 - BIYAGAMA -> SIRIO BADALGAMA -> SLIMLINE PANNALA', 'ELASTIC', 'FG_OTHER', '124', '112.00', NULL, '1', '', '2026-09-09 12:52:54', '2026-09-09 12:52:54'),
  ('23', 'RTE-0023', 'STR 1 - BIYAGAMA -> SLIMLINE PANNALA', 'ELASTIC', 'FG_OTHER', '124', '108.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0022', '2026-09-09 12:52:54', '2026-09-09 12:52:54'),
  ('24', 'RTE-0024', 'STR 1 - BIYAGAMA -> HORANA BODYLINE -> UNICHELA PANADURA -> MDS RATMALANA', 'ELASTIC', 'FG_OTHER', '124', '112.00', NULL, '1', '', '2026-09-09 16:23:20', '2026-09-09 16:23:20'),
  ('25', 'RTE-0025', 'STR 1 - BIYAGAMA -> UNICHELA PANADURA', 'ELASTIC', 'FG_OTHER', '124', '87.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0024', '2026-09-09 16:23:20', '2026-09-09 16:23:20'),
  ('26', 'RTE-0026', 'STR 1 - BIYAGAMA -> MDS RATMALANA', 'ELASTIC', 'FG_OTHER', '124', '58.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0024', '2026-09-09 16:23:20', '2026-09-09 16:23:20'),
  ('27', 'RTE-0027', 'STR 1 - BIYAGAMA -> CRYSTAL MARTIN MALWATTA -> CRYSTAL MARTIN WATHUPITIWALA', 'ELASTIC', 'FG_OTHER', '124', '66.00', NULL, '1', '', '2026-09-09 16:29:24', '2026-09-09 16:29:24'),
  ('28', 'RTE-0028', 'STR 1 - BIYAGAMA -> CRYSTAL MARTIN MALWATTA', 'ELASTIC', 'FG_OTHER', '124', '57.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0027', '2026-09-09 16:29:24', '2026-09-09 16:29:24'),
  ('29', 'RTE-0029', 'STR 1 - BIYAGAMA -> CRYSTAL MARTIN WATHUPITIWALA', 'ELASTIC', 'FG_OTHER', '124', '66.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0027', '2026-09-09 16:29:24', '2026-09-09 16:29:24'),
  ('30', 'RTE-0030', 'STR 1 - BIYAGAMA -> BRANDIX - ADVANTIS KOTUGODA -> INQUBE - ADVANTIS KOTUGODA', 'ELASTIC', 'FG_OTHER', '124', '69.00', NULL, '1', '', '2026-09-10 10:05:33', '2026-09-10 10:05:33'),
  ('31', 'RTE-0031', 'STR 1 - BIYAGAMA -> INQUBE - ADVANTIS KOTUGODA', 'ELASTIC', 'FG_OTHER', '124', '34.50', 'DIRECT', '1', 'Direct route auto-generated from RTE-0030', '2026-09-10 10:05:33', '2026-09-10 10:05:33'),
  ('32', 'RTE-0032', 'STR 1 - BIYAGAMA -> INQUBE - ADVANTIS KOTUGODA -> BRANDIX - ADVANTIS KOTUGODA -> EXPO KADANA', 'ELASTIC', 'FG_OTHER', '124', '73.00', NULL, '1', '', '2026-09-10 11:02:26', '2026-09-10 11:02:26'),
  ('33', 'RTE-0033', 'STR 1 - BIYAGAMA -> SIMTEX KULIYAPITIYA -> SLIMLINE PANNALA -> WACOAL WATHUPITIWALA', 'ELASTIC', 'FG_OTHER', '124', '155.00', NULL, '1', '', '2026-09-10 13:35:36', '2026-09-10 13:35:36'),
  ('34', 'RTE-0034', 'STR 1 - BIYAGAMA -> SIMTEX KULIYAPITIYA', 'ELASTIC', 'FG_OTHER', '124', '139.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0033', '2026-09-10 13:35:36', '2026-09-10 13:35:36'),
  ('35', 'RTE-0035', 'STR 1 - BIYAGAMA -> WACOAL WATHUPITIWALA', 'ELASTIC', 'FG_OTHER', '124', '62.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0033', '2026-09-10 13:35:36', '2026-09-10 13:35:36'),
  ('36', 'RTE-0036', 'STR 2 - MT LAVINIA -> MDS RATMALANA', 'ELASTIC', 'FG_OTHER', '153', '13.00', NULL, '1', '', '2026-09-10 13:46:19', '2026-09-10 13:46:19'),
  ('37', 'RTE-0037', 'STR 2 - MT LAVINIA -> BENJI BINGIRIYA -> SLIMLINE PANNALA -> OMEGALINE SANDALANKAWA -> SIRIO BADALGA', 'ELASTIC', 'FG_OTHER', '153', '242.00', NULL, '1', '', '2026-09-10 15:39:57', '2026-09-10 15:39:57'),
  ('38', 'RTE-0038', 'STR 2 - MT LAVINIA -> SLIMLINE PANNALA', 'ELASTIC', 'FG_OTHER', '153', '149.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0037', '2026-09-10 15:39:57', '2026-09-10 15:39:57'),
  ('39', 'RTE-0039', 'STR 2 - MT LAVINIA -> OMEGALINE SANDALANKAWA', 'ELASTIC', 'FG_OTHER', '153', '143.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0037', '2026-09-10 15:39:57', '2026-09-10 15:39:57'),
  ('40', 'RTE-0040', 'STR 2 - MT LAVINIA -> SIRIO BADALGAMA', 'ELASTIC', 'FG_OTHER', '153', '142.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0037', '2026-09-10 15:39:57', '2026-09-10 15:39:57'),
  ('41', 'RTE-0041', 'STR 2 - MT LAVINIA -> OMEGALINE - VAVNIYA', 'ELASTIC', 'FG_OTHER', '153', '563.00', NULL, '1', '', '2026-09-10 15:43:36', '2026-09-10 15:43:36'),
  ('42', 'RTE-0042', 'STR 2 - MT LAVINIA -> BRANDIX (BLI) WATHUPITIWALA -> ATG LANKA - WATHUPITIWALA -> EMJAY KURUNEGALA', 'ELASTIC', 'FG_OTHER', '153', '253.00', NULL, '1', '', '2026-09-10 15:47:38', '2026-09-10 15:47:38'),
  ('43', 'RTE-0043', 'STR 2 - MT LAVINIA -> ATG LANKA - WATHUPITIWALA', 'ELASTIC', 'FG_OTHER', '153', '114.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0042', '2026-09-10 15:47:38', '2026-09-10 15:47:38'),
  ('44', 'RTE-0044', 'STR 2 - MT LAVINIA -> EMJAY KURUNEGALA', 'ELASTIC', 'FG_OTHER', '153', '246.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0042', '2026-09-10 15:47:38', '2026-09-10 15:47:38'),
  ('45', 'RTE-0045', 'STR 2 - MT LAVINIA -> KOGGALA UNICHELA', 'ELASTIC', 'FG_OTHER', '153', '248.00', NULL, '1', '', '2026-09-10 15:58:19', '2026-09-10 15:58:19'),
  ('46', 'RTE-0046', 'STR 1 - BIYAGAMA -> RM HOLDING - KATANA -> NARAMMALA - JINADASA', 'ELASTIC', 'FG_OTHER', '124', '165.00', NULL, '1', '', '2026-09-10 16:02:41', '2026-09-10 16:02:41'),
  ('47', 'RTE-0047', 'STR 1 - BIYAGAMA -> RM HOLDING - KATANA', 'ELASTIC', 'FG_OTHER', '124', '90.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0046', '2026-09-10 16:02:41', '2026-09-10 16:02:41'),
  ('48', 'RTE-0048', 'STR 1 - BIYAGAMA -> HORANA BODYLINE -> STEWARTS LANKA - BANDARAGAMA', 'ELASTIC', 'FG_OTHER', '124', '98.00', NULL, '1', '', '2026-09-10 16:05:29', '2026-09-10 16:05:29'),
  ('49', 'RTE-0049', 'STR 1 - BIYAGAMA -> STEWARTS LANKA - BANDARAGAMA', 'ELASTIC', 'FG_OTHER', '124', '73.00', 'DIRECT', '1', 'Direct route auto-generated from RTE-0048', '2026-09-10 16:05:29', '2026-09-10 16:05:29');

-- -----------------------------------------------------------------------------
-- Table: route_stops (118 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "route_stops" ("id", "route_id", "location_id", "stop_sequence", "leg_distance_km", "cumulative_distance_km", "estimated_time", "active") VALUES
  ('1', '1', '124', '0', '0.00', '0.00', NULL, '1'),
  ('2', '1', '175', '1', '265.00', '265.00', NULL, '1'),
  ('5', '3', '124', '0', '0.00', '0.00', NULL, '1'),
  ('6', '3', '183', '1', '239.00', '239.00', NULL, '1'),
  ('7', '4', '153', '0', '0.00', '0.00', NULL, '1'),
  ('8', '4', '202', '1', '48.00', '48.00', NULL, '1'),
  ('9', '4', '192', '2', '0.00', '48.00', NULL, '1'),
  ('10', '5', '153', '0', '0.00', '0.00', NULL, '1'),
  ('11', '5', '202', '1', '48.00', '48.00', NULL, '1'),
  ('12', '6', '153', '0', '0.00', '0.00', NULL, '1'),
  ('13', '6', '192', '1', '48.00', '48.00', NULL, '1'),
  ('14', '7', '153', '0', '0.00', '0.00', NULL, '1'),
  ('15', '7', '10', '1', '97.00', '97.00', NULL, '1'),
  ('16', '7', '178', '2', '0.00', '58.00', NULL, '1'),
  ('21', '2', '124', '0', '0.00', '0.00', NULL, '1'),
  ('22', '2', '153', '1', '31.00', '31.00', NULL, '1'),
  ('23', '10', '153', '0', '0.00', '0.00', NULL, '1'),
  ('24', '10', '124', '1', '31.00', '31.00', NULL, '1'),
  ('25', '11', '124', '0', '0.00', '0.00', NULL, '1'),
  ('26', '11', '163', '1', '44.00', '44.00', NULL, '1'),
  ('27', '12', '124', '0', '0.00', '0.00', NULL, '1'),
  ('28', '12', '182', '1', '34.50', '34.50', NULL, '1'),
  ('29', '13', '124', '0', '0.00', '0.00', NULL, '1'),
  ('30', '13', '192', '1', '33.00', '33.00', NULL, '1'),
  ('31', '13', '202', '2', '0.00', '33.00', NULL, '1'),
  ('34', '15', '124', '0', '0.00', '0.00', NULL, '1'),
  ('35', '15', '202', '1', '33.00', '33.00', NULL, '1'),
  ('36', '16', '124', '0', '0.00', '0.00', NULL, '1'),
  ('37', '16', '38', '1', '53.00', '53.00', NULL, '1'),
  ('38', '16', '196', '2', '96.00', '149.00', NULL, '1'),
  ('39', '17', '124', '0', '0.00', '0.00', NULL, '1'),
  ('40', '17', '38', '1', '53.00', '53.00', NULL, '1'),
  ('41', '18', '124', '0', '0.00', '0.00', NULL, '1'),
  ('42', '18', '196', '1', '149.00', '149.00', NULL, '1'),
  ('43', '19', '124', '0', '0.00', '0.00', NULL, '1'),
  ('44', '19', '164', '1', '40.00', '40.00', NULL, '1'),
  ('45', '20', '124', '0', '0.00', '0.00', NULL, '1'),
  ('46', '20', '172', '1', '46.00', '46.00', NULL, '1'),
  ('47', '21', '124', '0', '0.00', '0.00', NULL, '1'),
  ('48', '21', '98', '1', '104.00', '104.00', NULL, '1'),
  ('49', '22', '124', '0', '0.00', '0.00', NULL, '1'),
  ('50', '22', '98', '1', '104.00', '104.00', NULL, '1'),
  ('51', '22', '100', '2', '4.00', '108.00', NULL, '1'),
  ('52', '23', '124', '0', '0.00', '0.00', NULL, '1'),
  ('53', '23', '100', '1', '108.00', '108.00', NULL, '1'),
  ('54', '24', '124', '0', '0.00', '0.00', NULL, '1'),
  ('55', '24', '163', '1', '44.00', '44.00', NULL, '1'),
  ('56', '24', '166', '2', '43.00', '87.00', NULL, '1'),
  ('57', '24', '167', '3', '0.00', '58.00', NULL, '1'),
  ('58', '25', '124', '0', '0.00', '0.00', NULL, '1');
INSERT INTO "route_stops" ("id", "route_id", "location_id", "stop_sequence", "leg_distance_km", "cumulative_distance_km", "estimated_time", "active") VALUES
  ('59', '25', '166', '1', '87.00', '87.00', NULL, '1'),
  ('60', '26', '124', '0', '0.00', '0.00', NULL, '1'),
  ('61', '26', '167', '1', '58.00', '58.00', NULL, '1'),
  ('62', '27', '124', '0', '0.00', '0.00', NULL, '1'),
  ('63', '27', '198', '1', '57.00', '57.00', NULL, '1'),
  ('64', '27', '179', '2', '9.00', '66.00', NULL, '1'),
  ('65', '28', '124', '0', '0.00', '0.00', NULL, '1'),
  ('66', '28', '198', '1', '57.00', '57.00', NULL, '1'),
  ('67', '29', '124', '0', '0.00', '0.00', NULL, '1'),
  ('68', '29', '179', '1', '66.00', '66.00', NULL, '1'),
  ('69', '30', '124', '0', '0.00', '0.00', NULL, '1'),
  ('70', '30', '182', '1', '34.50', '34.50', NULL, '1'),
  ('71', '30', '181', '2', '0.00', '34.50', NULL, '1'),
  ('72', '31', '124', '0', '0.00', '0.00', NULL, '1'),
  ('73', '31', '181', '1', '34.50', '34.50', NULL, '1'),
  ('74', '32', '124', '0', '0.00', '0.00', NULL, '1'),
  ('75', '32', '181', '1', '34.50', '34.50', NULL, '1'),
  ('76', '32', '182', '2', '0.00', '34.50', NULL, '1'),
  ('77', '32', '38', '3', '18.50', '53.00', NULL, '1'),
  ('78', '14', '124', '0', '0.00', '0.00', NULL, '1'),
  ('79', '14', '192', '1', '33.00', '33.00', NULL, '1'),
  ('80', '33', '124', '0', '0.00', '0.00', NULL, '1'),
  ('81', '33', '174', '1', '139.00', '139.00', NULL, '1'),
  ('82', '33', '100', '2', '0.00', '108.00', NULL, '1'),
  ('83', '33', '177', '3', '0.00', '62.00', NULL, '1'),
  ('84', '34', '124', '0', '0.00', '0.00', NULL, '1'),
  ('85', '34', '174', '1', '139.00', '139.00', NULL, '1'),
  ('86', '35', '124', '0', '0.00', '0.00', NULL, '1'),
  ('87', '35', '177', '1', '62.00', '62.00', NULL, '1'),
  ('88', '36', '153', '0', '0.00', '0.00', NULL, '1'),
  ('89', '36', '167', '1', '13.00', '13.00', NULL, '1'),
  ('90', '8', '153', '0', '0.00', '0.00', NULL, '1'),
  ('91', '8', '10', '1', '190.00', '190.00', NULL, '1'),
  ('92', '37', '153', '0', '0.00', '0.00', NULL, '1'),
  ('93', '37', '10', '1', '190.00', '190.00', NULL, '1'),
  ('94', '37', '100', '2', '0.00', '149.00', NULL, '1'),
  ('95', '37', '171', '3', '0.00', '143.00', NULL, '1'),
  ('96', '37', '98', '4', '0.00', '142.00', NULL, '1'),
  ('97', '38', '153', '0', '0.00', '0.00', NULL, '1'),
  ('98', '38', '100', '1', '149.00', '149.00', NULL, '1'),
  ('99', '39', '153', '0', '0.00', '0.00', NULL, '1'),
  ('100', '39', '171', '1', '143.00', '143.00', NULL, '1'),
  ('101', '40', '153', '0', '0.00', '0.00', NULL, '1'),
  ('102', '40', '98', '1', '142.00', '142.00', NULL, '1'),
  ('103', '41', '153', '0', '0.00', '0.00', NULL, '1'),
  ('104', '41', '188', '1', '563.00', '563.00', NULL, '1'),
  ('105', '9', '153', '0', '0.00', '0.00', NULL, '1'),
  ('106', '9', '178', '1', '114.00', '114.00', NULL, '1'),
  ('107', '42', '153', '0', '0.00', '0.00', NULL, '1'),
  ('108', '42', '178', '1', '114.00', '114.00', NULL, '1');
INSERT INTO "route_stops" ("id", "route_id", "location_id", "stop_sequence", "leg_distance_km", "cumulative_distance_km", "estimated_time", "active") VALUES
  ('109', '42', '159', '2', '0.00', '114.00', NULL, '1'),
  ('110', '42', '186', '3', '132.00', '246.00', NULL, '1'),
  ('111', '43', '153', '0', '0.00', '0.00', NULL, '1'),
  ('112', '43', '159', '1', '114.00', '114.00', NULL, '1'),
  ('113', '44', '153', '0', '0.00', '0.00', NULL, '1'),
  ('114', '44', '186', '1', '246.00', '246.00', NULL, '1'),
  ('115', '45', '153', '0', '0.00', '0.00', NULL, '1'),
  ('116', '45', '175', '1', '248.00', '248.00', NULL, '1'),
  ('117', '46', '124', '0', '0.00', '0.00', NULL, '1'),
  ('118', '46', '173', '1', '90.00', '90.00', NULL, '1'),
  ('119', '46', '196', '2', '59.00', '149.00', NULL, '1'),
  ('120', '47', '124', '0', '0.00', '0.00', NULL, '1'),
  ('121', '47', '173', '1', '90.00', '90.00', NULL, '1'),
  ('122', '48', '124', '0', '0.00', '0.00', NULL, '1'),
  ('123', '48', '163', '1', '44.00', '44.00', NULL, '1'),
  ('124', '48', '205', '2', '29.00', '73.00', NULL, '1'),
  ('125', '49', '124', '0', '0.00', '0.00', NULL, '1'),
  ('126', '49', '205', '1', '73.00', '73.00', NULL, '1');

-- -----------------------------------------------------------------------------
-- Table: vehicle_requests (59 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "vehicle_requests" ("id", "request_code", "requester_id", "plant_id", "operation_id", "sub_operation_id", "request_type", "from_location_id", "to_location_id", "route_id", "planned_distance_km", "contact_person", "contact_phone", "item_description", "quantity", "unit", "box_count", "required_kg", "required_cbm", "vehicle_type_id", "required_date", "required_time", "goods_ready_status", "urgency", "remarks", "invoice_numbers", "status", "created_at", "updated_at") VALUES
  ('1', 'REQ-0001', '7', '1', '2', '2', NULL, '124', '175', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '148', '812.72', NULL, NULL, '2026-09-08', '12:00:00', 'Ready', 'Normal', '', NULL, 'COMPLETED', '2026-09-08 10:14:04', '2026-09-08 14:44:36'),
  ('3', 'REQ-0002', '6', '1', '2', '8', NULL, '124', '153', NULL, NULL, NULL, NULL, 'Other', NULL, NULL, '1', '1.00', '1.00', '19', '2026-09-08', '13:00:00', 'Ready', 'Normal', 'Empty Run from EP to STR 2', NULL, 'COMPLETED', '2026-09-08 11:47:38', '2026-09-08 11:48:29'),
  ('4', 'REQ-0004', '7', '1', '2', '2', NULL, '124', '182', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '177', '1144.18', NULL, NULL, '2026-09-08', '18:00:00', 'Ready', 'Normal', 'Night Loading', NULL, 'COMPLETED', '2026-09-08 12:07:43', '2026-09-09 12:59:52'),
  ('5', 'REQ-0005', '7', '1', '2', '2', NULL, '124', '10', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '4', '21.89', NULL, NULL, '2026-09-08', '14:00:00', 'Ready', 'Normal', 'Deleted by Requester: Duplicate entry / Created by mistake', NULL, 'CANCELLED', '2026-09-08 12:21:11', '2026-09-08 14:46:39'),
  ('6', 'REQ-0006', '8', '2', '2', '2', NULL, '153', '178', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '62', '500.00', '1.20', '21', '2026-09-08', '14:00:00', 'Ready', 'Urgent', 'DISPATCHED WITH LK-6471', NULL, 'COMPLETED', '2026-09-08 12:45:49', '2026-09-08 14:45:19'),
  ('7', 'REQ-0007', '8', '2', '2', '2', NULL, '153', '10', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '5', '15.00', '0.10', '21', '2026-09-08', '14:00:00', 'Ready', 'Urgent', 'DISPATCHED WITH LK-6471', NULL, 'COMPLETED', '2026-09-08 12:47:02', '2026-09-08 14:45:19'),
  ('8', 'REQ-0008', '8', '2', '2', '2', NULL, '153', '192', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '45', '100.00', '1.00', '23', '2026-09-08', '14:00:00', 'Ready', 'Normal', 'DISPATCHED WITH LM-1621', NULL, 'COMPLETED', '2026-09-08 12:48:45', '2026-09-08 14:45:06'),
  ('9', 'REQ-0009', '8', '2', '2', '2', NULL, '153', '124', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '14', '300.00', '1.00', NULL, '2026-09-08', '14:00:00', 'Ready', 'Normal', 'DISPATCHED WITH 47-9845', NULL, 'COMPLETED', '2026-09-08 12:51:58', '2026-09-08 14:45:55'),
  ('10', 'REQ-0010', '8', '2', '2', '6', NULL, '153', '124', NULL, NULL, NULL, NULL, 'Greige', NULL, NULL, '16', '500.00', '1.50', '25', '2026-09-08', '14:00:00', 'Ready', 'Normal', 'DISPATCHED WITH 47-9845', NULL, 'COMPLETED', '2026-09-08 12:57:08', '2026-09-08 14:45:55'),
  ('11', 'REQ-0011', '8', '2', '2', '2', NULL, '153', '202', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '62', '600.00', '1.20', '23', '2026-09-08', '14:00:00', 'Ready', 'Normal', 'DISPATCHED WITH LM', NULL, 'COMPLETED', '2026-09-08 12:58:12', '2026-09-08 14:45:06'),
  ('12', 'REQ-0012', '7', '1', '2', '2', NULL, '124', '163', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '52', '231.16', NULL, NULL, '2026-09-08', '18:00:00', 'Ready', 'Normal', '', NULL, 'COMPLETED', '2026-09-08 13:07:43', '2026-09-09 07:52:35'),
  ('13', 'REQ-0013', '7', '1', '2', '2', NULL, '124', '183', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '115', '759.64', NULL, NULL, '2026-09-08', '15:00:00', 'Ready', 'Normal', '', NULL, 'COMPLETED', '2026-09-08 13:13:30', '2026-09-08 14:44:56'),
  ('14', 'REQ-0014', '8', '2', '2', '2', NULL, '153', '124', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '90', '800.00', '2.00', NULL, '2026-09-08', '15:00:00', 'Ready', 'Normal', 'Deleted by Requester: Duplicate entry / Created by mistake', NULL, 'CANCELLED', '2026-09-08 13:23:35', '2026-09-08 14:26:48'),
  ('15', 'REQ-0015', '7', '1', '2', '2', NULL, '124', '196', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '11', '69.41', NULL, NULL, '2026-09-08', '16:00:00', 'Ready', 'Normal', '', NULL, 'COMPLETED', '2026-09-08 13:27:29', '2026-09-09 07:52:48'),
  ('16', 'REQ-0016', '7', '1', '2', '2', NULL, '124', '202', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '5', '16.20', NULL, NULL, '2026-09-08', '17:00:00', 'Ready', 'Normal', '', NULL, 'COMPLETED', '2026-09-08 15:12:41', '2026-09-09 12:59:31'),
  ('17', 'REQ-0017', '7', '1', '2', '2', NULL, '124', '38', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '6', '21.83', NULL, NULL, '2026-09-08', '17:00:00', 'Ready', 'Normal', '', NULL, 'COMPLETED', '2026-09-08 15:15:10', '2026-09-09 07:52:48'),
  ('18', 'REQ-0018', '7', '1', '2', '2', NULL, '124', '192', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '3', '9.22', NULL, NULL, '2026-09-08', '17:00:00', 'Ready', 'Normal', '', NULL, 'COMPLETED', '2026-09-08 15:19:00', '2026-09-09 12:59:31'),
  ('19', 'REQ-0019', '7', '1', '2', '2', NULL, '124', '164', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '110', '390.75', NULL, NULL, '2026-09-08', '19:00:00', 'Ready', 'Normal', '', NULL, 'COMPLETED', '2026-09-08 15:25:47', '2026-09-10 11:06:12'),
  ('20', 'REQ-0020', '7', '1', '2', '2', NULL, '124', '172', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '168', '906.40', NULL, NULL, '2026-09-09', '10:00:00', 'Ready', 'Normal', '', NULL, 'COMPLETED', '2026-09-09 08:22:37', '2026-09-09 12:59:42'),
  ('21', 'REQ-0021', '7', '1', '2', '2', NULL, '124', '98', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '15', '20.02', NULL, NULL, '2026-09-09', '12:00:00', 'Ready', 'Normal', '', 'EPVT_000002627
EPVT_000002628
EPVT_000002631
EPVT_000002633
EPVT_000002630
EPVT_000002632
EPVT_000002629', 'COMPLETED', '2026-09-09 10:01:37', '2026-09-10 11:05:51'),
  ('22', 'REQ-0022', '7', '1', '2', '2', NULL, '124', '163', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '24', '152.31', NULL, NULL, '2026-09-09', '17:00:00', 'Ready', 'Normal', '', 'EPVT_000002626
EPVT_000002640
EPVT_000002656', 'COMPLETED', '2026-09-09 10:11:13', '2026-09-10 11:05:56'),
  ('23', 'REQ-0023', '7', '1', '2', '2', NULL, '124', '166', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '152', '673.13', NULL, NULL, '2026-09-09', '17:00:00', 'Ready', 'Normal', '', 'EPVT_000002634
EPVT_000002636
EPVT_000002637
EPVT_000002635', 'COMPLETED', '2026-09-09 10:13:26', '2026-09-10 11:05:56'),
  ('24', 'REQ-0024', '7', '1', '2', '2', NULL, '124', '100', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '69', '271.39', NULL, NULL, '2026-09-09', '14:00:00', 'Ready', 'Normal', '', 'EPVT_000002621
EPVT_000002625
EPVT_000002624
EPVT_000002623
EPVT_000002622
EPVT_000002643
EPVT_000002645
EPVT_000002655
EPVT_000002662
EPVT_000002654', 'COMPLETED', '2026-09-09 10:17:57', '2026-09-10 11:05:51'),
  ('25', 'REQ-0025', '7', '1', '2', '2', NULL, '124', '174', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '69', '388.20', NULL, NULL, '2026-09-09', '14:00:00', 'Ready', 'Normal', '', 'M00028-T (SLIMTEX)
EPVT_000002638
EPVT_000002644', 'ALLOCATED', '2026-09-09 12:17:22', '2026-09-10 13:36:10'),
  ('26', 'REQ-0026', '7', '1', '2', '2', NULL, '124', '179', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '32', '125.71', NULL, NULL, '2026-09-09', '18:00:00', 'Ready', 'Normal', '', 'C00045-T (CRYSTAL MARTIN)
EPVT_000002613
EPVT_000002647', 'COMPLETED', '2026-09-09 12:35:10', '2026-09-10 11:06:00'),
  ('27', 'REQ-0027', '7', '1', '2', '2', NULL, '124', '198', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '4', '25.94', NULL, NULL, '2026-09-09', '18:00:00', 'Ready', 'Normal', '', 'COOO46-T (CRYSTAL MARTIN-MALWATTA)
EPVT_000002648', 'COMPLETED', '2026-09-09 12:39:07', '2026-09-10 11:06:00'),
  ('28', 'REQ-0028', '7', '1', '2', '2', NULL, '124', '167', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '6', '2.81', NULL, NULL, '2026-09-09', '14:00:00', 'Ready', 'Normal', '', 'M000110-T (MDS)
EPVT_000002650
EPVT_000002651
EPVT_000002614
EPVT_000002673', 'COMPLETED', '2026-09-09 12:46:42', '2026-09-10 11:05:56'),
  ('29', 'REQ-0029', '7', '1', '2', '2', NULL, '124', '181', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '23', '127.42', NULL, NULL, '2026-09-10', '10:00:00', 'Ready', 'Normal', '', 'EPVT_000002660', 'ALLOCATED', '2026-09-10 08:48:41', '2026-09-10 10:05:43'),
  ('30', 'REQ-0030', '7', '1', '2', '2', NULL, '124', '182', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '45', '165.82', NULL, NULL, '2026-09-10', '10:00:00', 'Ready', 'Normal', '', 'EPVT_000002661
EPVT_000002659', 'ALLOCATED', '2026-09-10 08:50:00', '2026-09-10 10:05:43'),
  ('31', 'REQ-0031', '6', '1', '2', '8', NULL, '124', '153', NULL, NULL, NULL, NULL, 'Other', NULL, NULL, '1', '1.00', '1.00', '23', '2026-09-10', '13:00:00', 'Ready', 'Normal', 'Empty Run from EP to STR 2', NULL, 'COMPLETED', '2026-09-10 10:03:32', '2026-09-10 11:06:04'),
  ('32', 'REQ-0032', '7', '1', '2', '2', NULL, '124', '172', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '18', '108.98', NULL, NULL, '2026-09-10', '12:00:00', 'Ready', 'Normal', '', 'EPVT_000002691
EPVT_000002689
EPVT_000002705', 'ALLOCATED', '2026-09-10 10:17:22', '2026-09-10 11:40:01'),
  ('33', 'REQ-0033', '7', '1', '2', '2', NULL, '124', '192', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '31', '153.95', NULL, NULL, '2026-09-10', '12:00:00', 'Ready', 'Normal', '', 'EPVT_000002692
EPVT_000002701
EPVT_000002706', 'ALLOCATED', '2026-09-10 10:48:11', '2026-09-10 12:48:39'),
  ('34', 'REQ-0034', '7', '1', '2', '2', NULL, '124', '38', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '9', '108.98', NULL, NULL, '2026-09-10', '12:00:00', 'Ready', 'Normal', '', 'EPVT_000002687
EPVT_000002663
EPVT_000002664
EPVT_000002666', 'ALLOCATED', '2026-09-10 10:50:24', '2026-09-10 11:02:37'),
  ('35', 'REQ-0035', '7', '1', '2', '2', NULL, '124', '100', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '27', '161.12', NULL, NULL, '2026-09-10', '14:00:00', 'Ready', 'Normal', '', 'EPVT_000002702-Reprocess
EPVT_000002703
EPVT_000002682
EPVT_000002681
EPVT_000002709', 'ALLOCATED', '2026-09-10 12:32:48', '2026-09-10 14:28:24'),
  ('36', 'REQ-0036', '7', '1', '2', '2', NULL, '124', '177', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '22', '117.82', NULL, NULL, '2026-09-10', '14:00:00', 'Ready', 'Normal', '', 'EPVT_000002695', 'ALLOCATED', '2026-09-10 12:33:48', '2026-09-10 13:36:10'),
  ('37', 'REQ-0037', '7', '1', '2', '2', NULL, '124', '164', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '300', '1626.14', NULL, NULL, '2026-09-10', '14:00:00', 'Ready', 'Normal', '', 'EPVT_000002699
EPVT_000002698
EPVT_000002697
EPVT_000002684
EPVT_000002693
EPVT_000002694
EPVT_000002688
EPVT_000002686
EPVT_000002683
EPVT_000002715
EPVT_000002722
EPVT_000002720
EPVT_000002723
EPVT_000002718', 'ALLOCATED', '2026-09-10 12:40:40', '2026-09-10 15:32:26'),
  ('38', 'REQ-0038', '8', '2', '2', '2', NULL, '153', '10', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '35', '100.00', NULL, NULL, '2026-09-10', '17:00:00', 'Ready', 'Normal', '', NULL, 'ALLOCATED', '2026-09-10 13:25:41', '2026-09-10 15:40:50'),
  ('39', 'REQ-0039', '8', '2', '2', '2', NULL, '153', '171', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '180', '700.00', NULL, NULL, '2026-09-10', '17:00:00', 'Ready', 'Normal', '', NULL, 'ALLOCATED', '2026-09-10 13:26:31', '2026-09-10 15:40:50'),
  ('40', 'REQ-0040', '8', '2', '2', '2', NULL, '153', '98', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '10', '10.00', NULL, NULL, '2026-09-10', '17:00:00', 'Ready', 'Normal', '', NULL, 'ALLOCATED', '2026-09-10 13:27:09', '2026-09-10 15:40:50'),
  ('41', 'REQ-0041', '8', '2', '2', '2', NULL, '153', '188', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '40', '400.00', NULL, NULL, '2026-09-10', '17:00:00', 'Ready', 'Normal', 'Can use DAE', NULL, 'ALLOCATED', '2026-09-10 13:27:48', '2026-09-10 15:43:44'),
  ('42', 'REQ-0042', '8', '2', '2', '2', NULL, '153', '186', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '100', '400.00', NULL, NULL, '2026-09-10', '17:00:00', 'Ready', 'Normal', '', NULL, 'ALLOCATED', '2026-09-10 13:29:07', '2026-09-10 15:47:45'),
  ('43', 'REQ-0043', '8', '2', '2', '2', NULL, '153', '159', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '100', '400.00', NULL, NULL, '2026-09-10', '17:00:00', 'Ready', 'Normal', '', NULL, 'ALLOCATED', '2026-09-10 13:30:53', '2026-09-10 15:47:45'),
  ('44', 'REQ-0044', '8', '2', '2', '2', NULL, '153', '167', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '10', '10.00', NULL, NULL, '2026-09-10', '17:00:00', 'Ready', 'Normal', '', NULL, 'ALLOCATED', '2026-09-10 13:33:21', '2026-09-10 13:46:26'),
  ('45', 'REQ-0045', '8', '2', '2', '2', NULL, '153', '168', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '15', '20.00', NULL, NULL, '2026-09-10', '17:00:00', 'Ready', 'Normal', '', NULL, 'SUBMITTED', '2026-09-10 13:35:01', '2026-09-10 13:35:01'),
  ('46', 'REQ-0046', '8', '2', '2', '2', NULL, '153', '199', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '20', '30.00', NULL, NULL, '2026-09-10', '17:00:00', 'Ready', 'Normal', '', NULL, 'SUBMITTED', '2026-09-10 13:35:34', '2026-09-10 13:35:34'),
  ('47', 'REQ-0047', '8', '2', '2', '2', NULL, '153', '178', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '50', '100.00', NULL, NULL, '2026-09-10', '15:00:00', 'Ready', 'Normal', '', NULL, 'ALLOCATED', '2026-09-10 13:36:03', '2026-09-10 15:47:45'),
  ('48', 'REQ-0048', '8', '2', '2', '2', NULL, '153', '182', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '2', '2.00', NULL, NULL, '2026-09-10', '15:00:00', 'Ready', 'Normal', '', NULL, 'SUBMITTED', '2026-09-10 13:36:27', '2026-09-10 13:36:27'),
  ('49', 'REQ-0049', '8', '2', '2', '2', NULL, '153', '100', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '150', '400.00', NULL, NULL, '2026-09-10', '17:00:00', 'Ready', 'Normal', 'Can dispatch to MR', NULL, 'ALLOCATED', '2026-09-10 13:37:19', '2026-09-10 15:40:50'),
  ('50', 'REQ-0050', '8', '2', '2', '2', NULL, '153', '175', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '100', '800.00', NULL, NULL, '2026-09-10', '17:00:00', 'Ready', 'Normal', '', NULL, 'ALLOCATED', '2026-09-10 13:39:01', '2026-09-10 15:58:25'),
  ('51', 'REQ-0051', '8', '2', '2', '2', NULL, '153', '169', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '80', '500.00', NULL, NULL, '2026-09-10', '17:00:00', 'Ready', 'Normal', 'Confirmation Pending', NULL, 'SUBMITTED', '2026-09-10 13:39:40', '2026-09-10 13:39:40');
INSERT INTO "vehicle_requests" ("id", "request_code", "requester_id", "plant_id", "operation_id", "sub_operation_id", "request_type", "from_location_id", "to_location_id", "route_id", "planned_distance_km", "contact_person", "contact_phone", "item_description", "quantity", "unit", "box_count", "required_kg", "required_cbm", "vehicle_type_id", "required_date", "required_time", "goods_ready_status", "urgency", "remarks", "invoice_numbers", "status", "created_at", "updated_at") VALUES
  ('52', 'REQ-0052', '8', '2', '2', '2', NULL, '153', '202', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '5', '5.00', NULL, NULL, '2026-09-10', '17:00:00', 'Ready', 'Normal', '', NULL, 'SUBMITTED', '2026-09-10 13:40:44', '2026-09-10 13:40:44'),
  ('53', 'REQ-0053', '8', '2', '2', '2', NULL, '153', '179', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '2', '2.00', NULL, NULL, '2026-09-10', '15:00:00', 'Ready', 'Normal', 'Location is wrong, added the correct location to the list.', NULL, 'REJECTED', '2026-09-10 13:42:54', '2026-09-10 13:51:19'),
  ('54', 'REQ-0054', '8', '2', '2', '2', NULL, '153', '164', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '2', '2.00', NULL, NULL, '2026-09-10', '15:00:00', 'Ready', 'Normal', '', NULL, 'SUBMITTED', '2026-09-10 13:45:43', '2026-09-10 13:45:43'),
  ('55', 'REQ-0055', '6', '1', '2', '8', NULL, '124', '153', NULL, NULL, NULL, NULL, 'Other', NULL, NULL, '1', '1.00', NULL, NULL, '2026-09-10', '15:00:00', 'Ready', 'Normal', 'Empty Run from EP to STR 2', NULL, 'ALLOCATED', '2026-09-10 13:58:13', '2026-09-10 13:58:39'),
  ('56', 'REQ-0056', '7', '1', '2', '2', NULL, '124', '163', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '30', '139.23', NULL, NULL, '2026-09-10', '19:00:00', 'Ready', 'Normal', '', '(B00019-T )
EPVT_000002696
EPVT_000002716
EPVT_000002725
EPVT_000002724', 'ALLOCATED', '2026-09-10 15:06:24', '2026-09-10 17:05:22'),
  ('57', 'REQ-0057', '7', '1', '2', '2', NULL, '124', '173', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '5', '11.38', NULL, NULL, '2026-09-10', '17:00:00', 'Ready', 'Normal', '', 'EPVT_000002719', 'ALLOCATED', '2026-09-10 15:25:17', '2026-09-10 16:02:52'),
  ('58', 'REQ-0058', '7', '1', '2', '2', NULL, '124', '205', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '1', '1.09', NULL, NULL, '2026-09-10', '17:00:00', 'Ready', 'Normal', '', '(S00067-T )
EPVT_000002700', 'ALLOCATED', '2026-09-10 15:57:57', '2026-09-10 16:05:34'),
  ('59', 'REQ-0059', '7', '1', '2', '2', NULL, '124', '196', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '4', '14.12', NULL, NULL, '2026-09-10', '17:00:00', 'Ready', 'Normal', '', '(Q00040-T)
EPVT_000002641
EPVT_000002713', 'ALLOCATED', '2026-09-10 16:00:31', '2026-09-10 16:02:52'),
  ('60', 'REQ-0060', '8', '2', '2', '2', NULL, '153', '203', NULL, NULL, NULL, NULL, 'Finished Goods', NULL, NULL, '150', '1000.00', NULL, NULL, '2026-09-10', '18:00:00', 'Ready', 'Normal', '', NULL, 'SUBMITTED', '2026-09-10 16:06:52', '2026-09-10 16:06:52');

-- -----------------------------------------------------------------------------
-- Table: delivery_trips (29 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "delivery_trips" ("id", "trip_no", "vehicle_id", "driver_id", "route_id", "planned_km", "actual_km", "payment_basis", "standard_cost", "estimated_cost", "actual_cost", "planned_start", "actual_start", "planned_end", "actual_end", "status", "admin_remarks", "completed_by", "completed_at", "created_at", "updated_at", "diesel_rate_applied", "fuel_cost", "running_cost", "driver_profit", "fixed_daily_cost", "total_trip_cost") VALUES
  ('2', 'TRIP-0001', '8', '8', '1', '265.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'COMPLETED', '', '6', '2026-09-08 02:14:36', '2026-09-08 11:03:58', '2026-09-08 14:44:36', NULL, NULL, NULL, NULL, NULL, NULL),
  ('4', 'TRIP-0003', '5', '5', '2', '62.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'COMPLETED', 'Empty Run', '6', '2026-09-07 23:18:29', '2026-09-08 11:48:12', '2026-09-08 11:48:29', NULL, NULL, NULL, NULL, NULL, NULL),
  ('5', 'TRIP-0005', '6', '6', '3', '239.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RECONCILED', 'Dispatched with STR 2 Goods', '6', '2026-09-08 02:14:56', '2026-09-08 13:15:12', '2026-09-09 11:04:24', NULL, NULL, NULL, NULL, NULL, NULL),
  ('6', 'TRIP-0006', '15', '15', '4', '98.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'COMPLETED', '', '6', '2026-09-08 02:15:06', '2026-09-08 13:29:38', '2026-09-08 14:45:06', NULL, NULL, NULL, NULL, NULL, NULL),
  ('7', 'TRIP-0007', '9', '9', '7', '224.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'COMPLETED', '', '6', '2026-09-08 02:15:19', '2026-09-08 14:22:36', '2026-09-08 14:45:19', NULL, NULL, NULL, NULL, NULL, NULL),
  ('8', 'TRIP-0008', '16', '16', '10', '62.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'COMPLETED', '', '6', '2026-09-08 02:15:55', '2026-09-08 14:29:36', '2026-09-08 14:45:55', NULL, NULL, NULL, NULL, NULL, NULL),
  ('9', 'TRIP-0009', '14', '14', '11', '88.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RECONCILED', '', '6', '2026-09-08 19:22:35', '2026-09-08 14:34:10', '2026-09-09 11:04:24', NULL, NULL, NULL, NULL, NULL, NULL),
  ('10', 'TRIP-0010', '10', '10', '12', '69.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'COMPLETED', '', '6', '2026-09-09 12:59:52', '2026-09-08 14:37:26', '2026-09-09 12:59:52', NULL, NULL, NULL, NULL, NULL, NULL),
  ('12', 'TRIP-0012', '1', '1', '16', '156.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'COMPLETED', '', '6', '2026-09-08 19:22:48', '2026-09-08 15:36:32', '2026-09-09 07:52:48', NULL, NULL, NULL, NULL, NULL, NULL),
  ('13', 'TRIP-0013', '3', '3', '13', '68.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'COMPLETED', '', '6', '2026-09-09 12:59:31', '2026-09-09 07:48:57', '2026-09-09 12:59:31', NULL, NULL, NULL, NULL, NULL, NULL),
  ('14', 'TRIP-0014', '13', '13', '19', '40.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'COMPLETED', '', '6', '2026-09-10 11:06:12', '2026-09-09 07:50:43', '2026-09-10 11:06:12', NULL, NULL, NULL, NULL, NULL, NULL),
  ('16', 'TRIP-0015', '7', '7', '20', '46.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'COMPLETED', '', '6', '2026-09-09 12:59:42', '2026-09-09 08:58:57', '2026-09-09 12:59:42', NULL, NULL, NULL, NULL, NULL, NULL),
  ('17', 'TRIP-0017', '5', '5', '22', '108.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'COMPLETED', 'Dispatch before 12.30pm', '6', '2026-09-10 11:05:51', '2026-09-09 10:13:11', '2026-09-10 11:05:51', NULL, NULL, NULL, NULL, NULL, NULL),
  ('18', 'TRIP-0018', '14', '14', '24', '87.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'COMPLETED', '', '6', '2026-09-10 11:05:56', '2026-09-09 16:23:31', '2026-09-10 11:05:56', NULL, NULL, NULL, NULL, NULL, NULL),
  ('19', 'TRIP-0019', '1', '1', '27', '66.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'COMPLETED', '', '6', '2026-09-10 11:06:00', '2026-09-09 16:29:31', '2026-09-10 11:06:00', NULL, NULL, NULL, NULL, NULL, NULL),
  ('20', 'TRIP-0020', '14', '14', '2', '62.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'COMPLETED', 'Empty Run', '6', '2026-09-10 11:06:04', '2026-09-10 10:04:03', '2026-09-10 11:06:04', NULL, NULL, NULL, NULL, NULL, NULL),
  ('21', 'TRIP-0021', '3', '3', '32', '53.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ASSIGNED', '', NULL, NULL, '2026-09-10 10:05:43', '2026-09-10 11:02:37', NULL, NULL, NULL, NULL, NULL, NULL),
  ('22', 'TRIP-0022', '7', '7', '20', '46.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ASSIGNED', '', NULL, NULL, '2026-09-10 10:39:06', '2026-09-10 10:39:06', NULL, NULL, NULL, NULL, NULL, NULL),
  ('25', 'TRIP-0023', '8', '8', '14', '68.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ASSIGNED', '', NULL, NULL, '2026-09-10 12:48:39', '2026-09-10 12:48:39', NULL, NULL, NULL, NULL, NULL, NULL),
  ('26', 'TRIP-0026', '10', '10', '19', '40.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ASSIGNED', '', NULL, NULL, '2026-09-10 13:22:06', '2026-09-10 13:22:06', NULL, NULL, NULL, NULL, NULL, NULL),
  ('27', 'TRIP-0027', '8', '8', '33', '139.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ASSIGNED', '', NULL, NULL, '2026-09-10 13:34:03', '2026-09-10 13:36:10', NULL, NULL, NULL, NULL, NULL, NULL),
  ('28', 'TRIP-0028', '9', '9', '36', '13.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ASSIGNED', '', NULL, NULL, '2026-09-10 13:46:26', '2026-09-10 13:46:26', NULL, NULL, NULL, NULL, NULL, NULL),
  ('29', 'TRIP-0029', '12', '12', '2', '62.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ASSIGNED', '', NULL, NULL, '2026-09-10 13:58:39', '2026-09-10 13:58:39', NULL, NULL, NULL, NULL, NULL, NULL),
  ('31', 'TRIP-0030', '12', '12', '37', '190.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ASSIGNED', '', NULL, NULL, '2026-09-10 15:40:28', '2026-09-10 15:40:50', NULL, NULL, NULL, NULL, NULL, NULL),
  ('32', 'TRIP-0032', '4', '4', '41', '563.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ASSIGNED', '', NULL, NULL, '2026-09-10 15:43:44', '2026-09-10 15:43:44', NULL, NULL, NULL, NULL, NULL, NULL),
  ('33', 'TRIP-0033', '9', '9', '42', '246.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ASSIGNED', '', NULL, NULL, '2026-09-10 15:45:00', '2026-09-10 15:47:45', NULL, NULL, NULL, NULL, NULL, NULL),
  ('34', 'TRIP-0034', '15', '15', '45', '248.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ASSIGNED', '', NULL, NULL, '2026-09-10 15:58:25', '2026-09-10 15:58:25', NULL, NULL, NULL, NULL, NULL, NULL),
  ('35', 'TRIP-0035', '5', '5', '46', '149.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ASSIGNED', '', NULL, NULL, '2026-09-10 16:00:46', '2026-09-10 16:02:52', NULL, NULL, NULL, NULL, NULL, NULL),
  ('36', 'TRIP-0036', '1', '1', '48', '73.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ASSIGNED', '', NULL, NULL, '2026-09-10 16:04:19', '2026-09-10 16:05:34', NULL, NULL, NULL, NULL, NULL, NULL);

-- -----------------------------------------------------------------------------
-- Table: trip_requests (49 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "trip_requests" ("trip_id", "request_id", "loading_sequence") VALUES
  ('2', '1', '1'),
  ('4', '3', '1'),
  ('5', '13', '1'),
  ('6', '8', '1'),
  ('6', '11', '1'),
  ('7', '6', '1'),
  ('7', '7', '1'),
  ('8', '9', '1'),
  ('8', '10', '1'),
  ('9', '12', '1'),
  ('10', '4', '1'),
  ('12', '15', '1'),
  ('12', '17', '1'),
  ('13', '16', '1'),
  ('13', '18', '1'),
  ('14', '19', '1'),
  ('16', '20', '1'),
  ('17', '21', '1'),
  ('17', '24', '1'),
  ('18', '22', '3'),
  ('18', '23', '2'),
  ('18', '28', '1'),
  ('19', '26', '2'),
  ('19', '27', '1'),
  ('20', '31', '1'),
  ('21', '29', '2'),
  ('21', '30', '3'),
  ('21', '34', '1'),
  ('22', '32', '1'),
  ('25', '33', '1'),
  ('26', '37', '1'),
  ('27', '25', '1'),
  ('27', '35', '2'),
  ('27', '36', '3'),
  ('28', '44', '1'),
  ('29', '55', '1'),
  ('31', '38', '1'),
  ('31', '39', '3'),
  ('31', '40', '4'),
  ('31', '49', '2'),
  ('32', '41', '1'),
  ('33', '42', '1'),
  ('33', '43', '3'),
  ('33', '47', '2'),
  ('34', '50', '1'),
  ('35', '57', '2'),
  ('35', '59', '1'),
  ('36', '56', '2'),
  ('36', '58', '1');

-- -----------------------------------------------------------------------------
-- Table: trip_gate_passes (8 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "trip_gate_passes" ("id", "trip_id", "request_id", "gate_pass_no", "remarks", "entered_by", "created_at", "status") VALUES
  ('2', '9', NULL, '260T1005733', '', '7', '2026-09-09 10:58:25', 'RECONCILED'),
  ('3', '9', NULL, '260T1005732', '', '7', '2026-09-09 10:58:25', 'RECONCILED'),
  ('4', '5', NULL, '260T1005728', '', '7', '2026-09-09 11:02:47', 'RECONCILED'),
  ('5', '5', NULL, '260T1005729', '', '7', '2026-09-09 11:02:47', 'RECONCILED'),
  ('6', '5', NULL, '260T1005730', '', '7', '2026-09-09 11:02:47', 'RECONCILED'),
  ('7', '5', NULL, '260T1005743', '', '7', '2026-09-09 11:02:47', 'RECONCILED'),
  ('8', '5', NULL, '260T1005744', '', '7', '2026-09-09 11:02:47', 'RECONCILED'),
  ('9', '10', NULL, '260T1005735', '', '7', '2026-09-10 07:39:09', 'ENTERED');

-- -----------------------------------------------------------------------------
-- Table: trip_reconciliations (7 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "trip_reconciliations" ("id", "trip_id", "gate_pass_no", "actual_vehicle_no", "actual_boxes", "actual_kg", "actual_cbm", "invoice_numbers", "customer_name", "delivery_address", "dispatched_date", "match_status", "variance_remarks", "reconciled_by", "reconciled_at") VALUES
  ('1', '9', '260T1005733', '227-7072', '37', '206.454', '0.7705', 'EPVT_000002568, EPVT_000002569, EPVT_000002585, EPVT_000002586, EPVT_000002592', 'BODYLINE (PVT) LTD.', 'BODYLINE [PVT] LIMITED, RATNAPURA ROAD, GUROGODAHORANA, 0', '9/8/2026', 'VARIANCE', 'Weight Variance: Planned 231.16 KG vs Actual 206.454 KG (Diff: 24.71 KG); Box Count Variance: Planned 52 vs Actual 37 Boxes', '6', '2026-09-09 11:04:24'),
  ('2', '9', '260T1005732', '227-7072', '2', '4.795', '0.0417', 'EPVT_000002589', 'BODYLINE (PVT) LTD.', 'BODYLINE [PVT] LIMITED, RATNAPURA ROAD, GUROGODAHORANA, 0', '9/8/2026', 'VARIANCE', 'Weight Variance: Planned 231.16 KG vs Actual 4.795 KG (Diff: 226.37 KG); Box Count Variance: Planned 52 vs Actual 2 Boxes', '6', '2026-09-09 11:04:24'),
  ('3', '5', '260T1005728', '68-3470', '3', '20.275', '0.0625', 'EPVT_000002583', 'BENJI LIMITED', 'BENJI LTD., ( Flash orders), Benji Ltd.,
Wellarawa Estate,
Bingiriya, Sri Lanka, 0', '9/8/2026', 'VARIANCE', 'Weight Variance: Planned 759.64 KG vs Actual 20.275 KG (Diff: 739.37 KG); Box Count Variance: Planned 115 vs Actual 3 Boxes', '6', '2026-09-09 11:04:24'),
  ('4', '5', '260T1005729', '68-3470', '17', '226.750', '0.3540', 'EPVT_000002562', 'UNICHELA PRIVATE LIMITED', 'UNICHELA (PVT) LTD, Linea Clothing 
pallakale , Kandy 
8500, 0', '9/8/2026', 'VARIANCE', 'Weight Variance: Planned 759.64 KG vs Actual 226.75 KG (Diff: 532.89 KG); Box Count Variance: Planned 115 vs Actual 17 Boxes', '6', '2026-09-09 11:04:24'),
  ('5', '5', '260T1005730', '68-3470', '57', '487.434', '1.1870', 'EPVT_000002590', 'UNICHELA PRIVATE LIMITED', 'UNICHELA (PVT) LTD, Linea Clothing 
pallakale , Kandy 
8500, 0', '9/8/2026', 'VARIANCE', 'Weight Variance: Planned 759.64 KG vs Actual 487.434 KG (Diff: 272.21 KG); Box Count Variance: Planned 115 vs Actual 57 Boxes', '6', '2026-09-09 11:04:24'),
  ('6', '5', '260T1005743', '68-3470', '5', '44.617', '0.1041', 'EPVT_000002582, EPVT_000002605', 'UNICHELA PRIVATE LIMITED', 'UNICHELA (PVT) LTD - VSD/VSX, SLIMLINE PVT LTD
KULIYAPITIYA ROAD,PANNALA SRI LA, 0', '9/8/2026', 'VARIANCE', 'Weight Variance: Planned 759.64 KG vs Actual 44.617 KG (Diff: 715.02 KG); Box Count Variance: Planned 115 vs Actual 5 Boxes', '6', '2026-09-09 11:04:24'),
  ('7', '5', '260T1005744', '68-3470', '51', '215.361', '1.0621', 'EPVT_000002561, EPVT_000002563', 'UNICHELA PRIVATE LIMITED', 'UNICHELA (PVT) LTD, Linea Clothing 
pallakale , Kandy 
8500, 0', '9/8/2026', 'VARIANCE', 'Weight Variance: Planned 759.64 KG vs Actual 215.361 KG (Diff: 544.28 KG); Box Count Variance: Planned 115 vs Actual 51 Boxes', '6', '2026-09-09 11:04:24');

-- -----------------------------------------------------------------------------
-- Table: notifications (110 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "notifications" ("id", "user_id", "role_target", "plant_id", "type", "title", "message", "link_url", "is_read", "created_at") VALUES
  ('1', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0001', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 10:14:04'),
  ('2', '7', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0001', 'Your request REQ-0001 has been allocated to Vehicle 227-3502 (Trip TRIP-0001).', 'https://str-vms.iceiy.com/requests/view/1', '1', '2026-09-08 10:22:48'),
  ('3', '7', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0001', 'Your request REQ-0001 has been allocated to Vehicle 227-3502 (Trip TRIP-0001).', 'https://str-vms.iceiy.com/requests/view/1', '1', '2026-09-08 11:03:58'),
  ('4', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0002', 'STR1 submitted request for Other (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 11:32:41'),
  ('5', '6', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0002', 'Your request REQ-0002 has been allocated to Vehicle GN-4557 (Trip TRIP-0003).', 'https://str-vms.iceiy.com/requests/view/2', '0', '2026-09-08 11:34:41'),
  ('6', '6', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0002', 'Trip TRIP-0003 completed successfully for your request REQ-0002.', 'https://str-vms.iceiy.com/requests/view/2', '0', '2026-09-08 11:34:52'),
  ('7', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0002', 'STR1 submitted request for Other (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 11:47:38'),
  ('8', '6', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0002', 'Your request REQ-0002 has been allocated to Vehicle GN-4557 (Trip TRIP-0003).', 'https://str-vms.iceiy.com/requests/view/3', '0', '2026-09-08 11:48:12'),
  ('9', '6', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0002', 'Trip TRIP-0003 completed successfully for your request REQ-0002.', 'https://str-vms.iceiy.com/requests/view/3', '0', '2026-09-08 11:48:29'),
  ('10', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0004', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 12:07:43'),
  ('11', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0005', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 12:21:11'),
  ('12', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0006', 'STR2 submitted request for Finished Goods (Urgency: Urgent)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 12:45:49'),
  ('13', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0007', 'STR2 submitted request for Finished Goods (Urgency: Urgent)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 12:47:02'),
  ('14', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0008', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 12:48:45'),
  ('15', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0009', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 12:51:58'),
  ('16', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0010', 'STR2 submitted request for Greige (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 12:57:08'),
  ('17', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0011', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 12:58:12'),
  ('18', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0012', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 13:07:43'),
  ('19', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0013', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 13:13:30'),
  ('20', '7', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0013', 'Your request REQ-0013 has been allocated to Vehicle 68-3470 (Trip TRIP-0005).', 'https://str-vms.iceiy.com/requests/view/13', '1', '2026-09-08 13:15:12'),
  ('21', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0014', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 13:23:35'),
  ('22', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0015', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 13:27:29'),
  ('23', NULL, 'ADMIN', NULL, 'CANCELLED', 'Request Deleted by User: REQ-0014', 'STR2 requester deleted request REQ-0014. Reason: Duplicate entry / Created by mistake', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 14:26:48'),
  ('24', '7', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0012', 'Your request REQ-0012 has been allocated to Vehicle 227-7072 (Trip TRIP-0009).', 'https://str-vms.iceiy.com/requests/view/12', '1', '2026-09-08 14:34:10'),
  ('25', '7', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0004', 'Your request REQ-0004 has been allocated to Vehicle GE-5975 (Trip TRIP-0010).', 'https://str-vms.iceiy.com/requests/view/4', '1', '2026-09-08 14:37:26'),
  ('26', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0001', 'Trip TRIP-0001 completed successfully for your request REQ-0001.', 'https://str-vms.iceiy.com/requests/view/1', '1', '2026-09-08 14:44:36'),
  ('27', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0013', 'Trip TRIP-0005 completed successfully for your request REQ-0013.', 'https://str-vms.iceiy.com/requests/view/13', '1', '2026-09-08 14:44:56'),
  ('28', '8', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0008', 'Trip TRIP-0006 completed successfully for your request REQ-0008.', 'https://str-vms.iceiy.com/requests/view/8', '0', '2026-09-08 14:45:06'),
  ('29', '8', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0011', 'Trip TRIP-0006 completed successfully for your request REQ-0011.', 'https://str-vms.iceiy.com/requests/view/11', '0', '2026-09-08 14:45:06'),
  ('30', '8', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0006', 'Trip TRIP-0007 completed successfully for your request REQ-0006.', 'https://str-vms.iceiy.com/requests/view/6', '0', '2026-09-08 14:45:19'),
  ('31', '8', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0007', 'Trip TRIP-0007 completed successfully for your request REQ-0007.', 'https://str-vms.iceiy.com/requests/view/7', '0', '2026-09-08 14:45:19'),
  ('32', '8', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0009', 'Trip TRIP-0008 completed successfully for your request REQ-0009.', 'https://str-vms.iceiy.com/requests/view/9', '0', '2026-09-08 14:45:55'),
  ('33', '8', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0010', 'Trip TRIP-0008 completed successfully for your request REQ-0010.', 'https://str-vms.iceiy.com/requests/view/10', '0', '2026-09-08 14:45:55'),
  ('34', NULL, 'ADMIN', NULL, 'CANCELLED', 'Request Deleted by User: REQ-0005', 'STR1 requester deleted request REQ-0005. Reason: Duplicate entry / Created by mistake', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 14:46:39'),
  ('35', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0016', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 15:12:41'),
  ('36', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0017', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 15:15:10'),
  ('37', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0018', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 15:19:00'),
  ('38', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0019', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-08 15:25:47'),
  ('39', '7', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0019', 'Your request REQ-0019 has been allocated to Vehicle 48-1015 (Trip TRIP-0014).', 'https://str-vms.iceiy.com/requests/view/19', '0', '2026-09-09 07:50:43'),
  ('40', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0012', 'Trip TRIP-0009 completed successfully for your request REQ-0012.', 'https://str-vms.iceiy.com/requests/view/12', '0', '2026-09-09 07:52:35'),
  ('41', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0015', 'Trip TRIP-0012 completed successfully for your request REQ-0015.', 'https://str-vms.iceiy.com/requests/view/15', '0', '2026-09-09 07:52:48'),
  ('42', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0017', 'Trip TRIP-0012 completed successfully for your request REQ-0017.', 'https://str-vms.iceiy.com/requests/view/17', '0', '2026-09-09 07:52:48'),
  ('43', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0020', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-09 08:22:37'),
  ('44', '7', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0020', 'Your request REQ-0020 has been allocated to Vehicle 68-3470 (Trip TRIP-0015).', 'https://str-vms.iceiy.com/requests/view/20', '1', '2026-09-09 08:54:14'),
  ('45', '7', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0020', 'Your request REQ-0020 has been allocated to Vehicle GB-6111 (Trip TRIP-0015).', 'https://str-vms.iceiy.com/requests/view/20', '1', '2026-09-09 08:58:57'),
  ('46', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0021', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-09 10:01:37'),
  ('47', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0022', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-09 10:11:13'),
  ('48', '7', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0021', 'Your request REQ-0021 has been allocated to Vehicle GN-4557 (Trip TRIP-0017).', 'https://str-vms.iceiy.com/requests/view/21', '1', '2026-09-09 10:13:11'),
  ('49', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0023', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-09 10:13:26'),
  ('50', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0024', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-09 10:17:57');
INSERT INTO "notifications" ("id", "user_id", "role_target", "plant_id", "type", "title", "message", "link_url", "is_read", "created_at") VALUES
  ('51', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0025', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-09 12:17:22'),
  ('52', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0026', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-09 12:35:10'),
  ('53', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0027', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-09 12:39:07'),
  ('54', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0028', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '1', '2026-09-09 12:46:42'),
  ('55', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0016', 'Trip TRIP-0013 completed successfully for your request REQ-0016.', 'https://str-vms.iceiy.com/requests/view/16', '0', '2026-09-09 12:59:31'),
  ('56', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0018', 'Trip TRIP-0013 completed successfully for your request REQ-0018.', 'https://str-vms.iceiy.com/requests/view/18', '0', '2026-09-09 12:59:31'),
  ('57', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0020', 'Trip TRIP-0015 completed successfully for your request REQ-0020.', 'https://str-vms.iceiy.com/requests/view/20', '0', '2026-09-09 12:59:42'),
  ('58', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0004', 'Trip TRIP-0010 completed successfully for your request REQ-0004.', 'https://str-vms.iceiy.com/requests/view/4', '1', '2026-09-09 12:59:52'),
  ('59', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0029', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 08:48:41'),
  ('60', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0030', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 08:50:00'),
  ('61', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0031', 'STR1 submitted request for Other (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 10:03:32'),
  ('62', '6', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0031', 'Your request REQ-0031 has been allocated to Vehicle 227-7072 (Trip TRIP-0020).', 'https://str-vms.iceiy.com/requests/view/31', '0', '2026-09-10 10:04:03'),
  ('63', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0032', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 10:17:22'),
  ('64', '7', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0032', 'Your request REQ-0032 has been allocated to Vehicle GB-6111 (Trip TRIP-0022).', 'https://str-vms.iceiy.com/requests/view/32', '0', '2026-09-10 10:39:06'),
  ('65', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0033', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 10:48:11'),
  ('66', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0034', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 10:50:24'),
  ('67', '7', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0033', 'Your request REQ-0033 has been allocated to Vehicle PY-3548 (Trip TRIP-0023).', 'https://str-vms.iceiy.com/requests/view/33', '0', '2026-09-10 11:04:54'),
  ('68', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0021', 'Trip TRIP-0017 completed successfully for your request REQ-0021.', 'https://str-vms.iceiy.com/requests/view/21', '0', '2026-09-10 11:05:51'),
  ('69', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0024', 'Trip TRIP-0017 completed successfully for your request REQ-0024.', 'https://str-vms.iceiy.com/requests/view/24', '0', '2026-09-10 11:05:51'),
  ('70', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0022', 'Trip TRIP-0018 completed successfully for your request REQ-0022.', 'https://str-vms.iceiy.com/requests/view/22', '0', '2026-09-10 11:05:56'),
  ('71', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0023', 'Trip TRIP-0018 completed successfully for your request REQ-0023.', 'https://str-vms.iceiy.com/requests/view/23', '0', '2026-09-10 11:05:56'),
  ('72', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0028', 'Trip TRIP-0018 completed successfully for your request REQ-0028.', 'https://str-vms.iceiy.com/requests/view/28', '0', '2026-09-10 11:05:56'),
  ('73', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0026', 'Trip TRIP-0019 completed successfully for your request REQ-0026.', 'https://str-vms.iceiy.com/requests/view/26', '0', '2026-09-10 11:06:00'),
  ('74', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0027', 'Trip TRIP-0019 completed successfully for your request REQ-0027.', 'https://str-vms.iceiy.com/requests/view/27', '0', '2026-09-10 11:06:00'),
  ('75', '6', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0031', 'Trip TRIP-0020 completed successfully for your request REQ-0031.', 'https://str-vms.iceiy.com/requests/view/31', '0', '2026-09-10 11:06:04'),
  ('76', '7', NULL, NULL, 'COMPLETED', 'Delivery Completed: REQ-0019', 'Trip TRIP-0014 completed successfully for your request REQ-0019.', 'https://str-vms.iceiy.com/requests/view/19', '0', '2026-09-10 11:06:12'),
  ('77', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0035', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 12:32:48'),
  ('78', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0036', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 12:33:48'),
  ('79', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0037', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 12:40:40'),
  ('80', '7', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0033', 'Your request REQ-0033 has been allocated to Vehicle 227-3502 (Trip TRIP-0023).', 'https://str-vms.iceiy.com/requests/view/33', '0', '2026-09-10 12:45:24'),
  ('81', '7', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0033', 'Your request REQ-0033 has been allocated to Vehicle 227-3502 (Trip TRIP-0023).', 'https://str-vms.iceiy.com/requests/view/33', '0', '2026-09-10 12:48:39'),
  ('82', '7', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0037', 'Your request REQ-0037 has been allocated to Vehicle GE-5975 (Trip TRIP-0026).', 'https://str-vms.iceiy.com/requests/view/37', '0', '2026-09-10 13:22:06'),
  ('83', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0038', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:25:41'),
  ('84', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0039', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:26:31'),
  ('85', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0040', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:27:09'),
  ('86', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0041', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:27:48'),
  ('87', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0042', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:29:07'),
  ('88', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0043', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:30:53'),
  ('89', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0044', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:33:21'),
  ('90', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0045', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:35:01'),
  ('91', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0046', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:35:34'),
  ('92', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0047', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:36:03'),
  ('93', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0048', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:36:27'),
  ('94', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0049', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:37:19'),
  ('95', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0050', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:39:01'),
  ('96', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0051', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:39:40'),
  ('97', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0052', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:40:44'),
  ('98', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0053', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:42:54'),
  ('99', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0054', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:45:43'),
  ('100', '8', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0044', 'Your request REQ-0044 has been allocated to Vehicle LK-6471 (Trip TRIP-0028).', 'https://str-vms.iceiy.com/requests/view/44', '0', '2026-09-10 13:46:26');
INSERT INTO "notifications" ("id", "user_id", "role_target", "plant_id", "type", "title", "message", "link_url", "is_read", "created_at") VALUES
  ('101', '8', NULL, NULL, 'REJECTED', 'Request Rejected: REQ-0053', 'Your request REQ-0053 was rejected. Reason: Location is wrong, added the correct location to the list.', 'https://str-vms.iceiy.com/requests/view/53', '0', '2026-09-10 13:51:19'),
  ('102', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0055', 'STR1 submitted request for Other (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 13:58:13'),
  ('103', '6', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0055', 'Your request REQ-0055 has been allocated to Vehicle 47-1911 (Trip TRIP-0029).', 'https://str-vms.iceiy.com/requests/view/55', '0', '2026-09-10 13:58:39'),
  ('104', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0056', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 15:06:24'),
  ('105', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0057', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 15:25:17'),
  ('106', '8', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0041', 'Your request REQ-0041 has been allocated to Vehicle DAE-9329 (Trip TRIP-0032).', 'https://str-vms.iceiy.com/requests/view/41', '0', '2026-09-10 15:43:44'),
  ('107', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0058', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 15:57:57'),
  ('108', '8', NULL, NULL, 'ALLOCATED', 'Request Allocated: REQ-0050', 'Your request REQ-0050 has been allocated to Vehicle LM-1621 (Trip TRIP-0034).', 'https://str-vms.iceiy.com/requests/view/50', '0', '2026-09-10 15:58:25'),
  ('109', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0059', 'STR1 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 16:00:31'),
  ('110', NULL, 'ADMIN', NULL, 'NEW_REQUEST', 'New Request: REQ-0060', 'STR2 submitted request for Finished Goods (Urgency: Normal)', 'https://str-vms.iceiy.com/allocations/fg', '0', '2026-09-10 16:06:52');

-- -----------------------------------------------------------------------------
-- Table: activity_logs (117 rows)
-- -----------------------------------------------------------------------------
INSERT INTO "activity_logs" ("id", "user_id", "action", "module", "record_id", "details", "ip_address", "created_at") VALUES
  ('1', '1', 'DELETE_USER', 'SETTINGS', 'USR-0002', 'Deleted user profile USR-0002 (Logistics Admin) safely while preserving all historical requests, trip records, and transaction logs', NULL, '2026-09-08 01:09:08'),
  ('2', '1', 'DELETE_USER', 'SETTINGS', 'USR-0003', 'Deleted user profile USR-0003 (Dispatcher STR (Planner)) safely while preserving all historical requests, trip records, and transaction logs', NULL, '2026-09-08 01:09:13'),
  ('3', '1', 'DELETE_USER', 'SETTINGS', 'USR-0004', 'Deleted user profile USR-0004 (Plant Requester (STR1)) safely while preserving all historical requests, trip records, and transaction logs', NULL, '2026-09-08 01:09:15'),
  ('4', '1', 'DELETE_USER', 'SETTINGS', 'USR-0005', 'Deleted user profile USR-0005 (Management Auditor) safely while preserving all historical requests, trip records, and transaction logs', NULL, '2026-09-08 01:09:18'),
  ('5', '1', 'CREATE_USER', 'SETTINGS', 'USR-0006', 'Created User Profile USR-0006 (Susith Fernando, susithf@stretchline.com) | Role: SUPER_ADMIN', NULL, '2026-09-08 01:09:45'),
  ('6', '1', 'LOGIN', 'AUTH', 'superadmin@str.com', 'User Isuru Ranasinghe (superadmin@str.com) signed in successfully', NULL, '2026-09-08 07:55:03'),
  ('7', '1', 'LOGOUT', 'AUTH', 'superadmin@str.com', 'User Isuru Ranasinghe signed out', NULL, '2026-09-08 08:36:16'),
  ('8', '1', 'LOGIN', 'AUTH', 'superadmin@str.com', 'User Isuru Ranasinghe (superadmin@str.com) signed in successfully', NULL, '2026-09-08 08:36:19'),
  ('9', '6', 'LOGIN', 'AUTH', 'susithf@stretchline.com', 'User Susith Fernando (susithf@stretchline.com) signed in successfully', NULL, '2026-09-08 08:39:38'),
  ('10', '6', 'CREATE_USER', 'SETTINGS', 'USR-0007', 'Created User Profile USR-0007 (Kasun Sirimanna, kasunsi@stretchline.com) | Role: ENTRY_USER', NULL, '2026-09-08 08:43:46'),
  ('11', '6', 'CREATE_USER', 'SETTINGS', 'USR-0008', 'Created User Profile USR-0008 (Andrew Kristy, andrewk@stretchline.com) | Role: ENTRY_USER', NULL, '2026-09-08 08:45:07'),
  ('12', '6', 'UPDATE_USER', 'SETTINGS', 'USR-0007', 'Updated User Profile USR-0007 (Kasun Sirimanna, kasunsi@stretchline.com) | Role: ENTRY_USER', NULL, '2026-09-08 09:51:50'),
  ('13', '6', 'UPDATE_USER', 'SETTINGS', 'USR-0007', 'Updated User Profile USR-0007 (Ravihari Thennakoon, raviharit@stretchline.com) | Role: ENTRY_USER', NULL, '2026-09-08 09:53:02'),
  ('14', '6', 'UPDATE_LIMITS', 'SETTINGS', NULL, 'Updated data display limits (Global: 100)', NULL, '2026-09-08 10:04:42'),
  ('15', '7', 'LOGIN', 'AUTH', 'raviharit@stretchline.com', 'User Ravihari Thennakoon (raviharit@stretchline.com) signed in successfully', NULL, '2026-09-08 10:11:27'),
  ('16', '7', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0001', 'Created FG Request REQ-0001 | Date: 2026-09-08 12:00 | Urgency: Normal | Item: Finished Goods', NULL, '2026-09-08 10:14:04'),
  ('17', '6', 'SINGLE_ALLOCATE', 'ALLOCATION', 'TRIP-0001', 'Allocated Request REQ-0001 to Trip TRIP-0001 | Vehicle: 227-3502 | Driver: Senapala | Route: STR 1 - BIYAGAMA -> KOGGALA UNICHELA | Distance: 265 km', NULL, '2026-09-08 10:22:48'),
  ('18', '6', 'DISCARD_TRIP', 'ALLOCATION', 'TRIP-1', 'Discarded Trip #1 and reverted 1 request(s) back to SUBMITTED status', NULL, '2026-09-08 10:35:51'),
  ('19', '6', 'CREATE_USER', 'SETTINGS', 'USR-0009', 'Created User Profile USR-0009 (Kasun Sirimanna, kasunsi@stretchline.com) | Role: ENTRY_USER', NULL, '2026-09-08 10:39:15'),
  ('20', '9', 'LOGIN', 'AUTH', 'kasunsi@stretchline.com', 'User Kasun Sirimanna (kasunsi@stretchline.com) signed in successfully', NULL, '2026-09-08 10:40:00'),
  ('21', '6', 'CREATE_USER', 'SETTINGS', 'USR-0010', 'Created User Profile USR-0010 (Saniru Kalmitha, saniruk@stretchline.com) | Role: ENTRY_USER', NULL, '2026-09-08 10:40:19'),
  ('22', '6', 'CREATE_LOCATION', 'MASTER_DATA', 'EFL - PELIYAGODA', 'Created Location EFL - PELIYAGODA (CUSTOMER)', NULL, '2026-09-08 10:49:00'),
  ('23', '6', 'CREATE_LOCATION', 'MASTER_DATA', 'EFL KANDANA', 'Created Location EFL KANDANA (CUSTOMER)', NULL, '2026-09-08 10:49:10'),
  ('24', '6', 'DELETE_LOCATION', 'MASTER_DATA', 'EFL - PELIYAGODA', 'Permanently deleted unused location EFL - PELIYAGODA', NULL, '2026-09-08 10:49:26'),
  ('25', '6', 'DELETE_LOCATION', 'MASTER_DATA', 'EFL KANDANA', 'Permanently deleted unused location EFL KANDANA', NULL, '2026-09-08 10:49:32'),
  ('26', '8', 'LOGIN', 'AUTH', 'andrewk@stretchline.com', 'User Andrew Kristy (andrewk@stretchline.com) signed in successfully', NULL, '2026-09-08 10:53:33'),
  ('27', '6', 'SINGLE_ALLOCATE', 'ALLOCATION', 'TRIP-0001', 'Allocated Request REQ-0001 to Trip TRIP-0001 | Vehicle: 227-3502 | Driver: Senapala | Route: STR 1 - BIYAGAMA -> KOGGALA UNICHELA | Distance: 265 km', NULL, '2026-09-08 11:03:58'),
  ('28', '6', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0002', 'Created FG Request REQ-0002 | Date: 2026-09-08 13:00 | Urgency: Normal | Item: Other', NULL, '2026-09-08 11:32:41'),
  ('29', '6', 'SINGLE_ALLOCATE', 'ALLOCATION', 'TRIP-0003', 'Allocated Request REQ-0002 to Trip TRIP-0003 | Vehicle: GN-4557 | Driver: Kumara | Route: STR 1 - BIYAGAMA -> STR 2 - MT LAVINIA | Distance: 62 km', NULL, '2026-09-08 11:34:41'),
  ('30', '6', 'COMPLETE_TRIP', 'TRIPS', 'TRIP-0003', 'Completed Trip TRIP-0003 | Vehicle: GN-4557 | Driver: Kumara', NULL, '2026-09-08 11:34:52'),
  ('31', '6', 'SAVE_FUEL_RATE', 'MASTER_DATA', '2026-09', 'Updated Diesel Rate for 2026-09 to LKR 382/L', NULL, '2026-09-08 11:37:54'),
  ('32', '6', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0002', 'Created FG Request REQ-0002 | Date: 2026-09-08 13:00 | Urgency: Normal | Item: Other', NULL, '2026-09-08 11:47:38'),
  ('33', '6', 'SINGLE_ALLOCATE', 'ALLOCATION', 'TRIP-0003', 'Allocated Request REQ-0002 to Trip TRIP-0003 | Vehicle: GN-4557 | Driver: Kumara | Route: STR 1 - BIYAGAMA -> STR 2 - MT LAVINIA | Distance: 62 km', NULL, '2026-09-08 11:48:12'),
  ('34', '6', 'COMPLETE_TRIP', 'TRIPS', 'TRIP-0003', 'Completed Trip TRIP-0003 | Vehicle: GN-4557 | Driver: Kumara', NULL, '2026-09-08 11:48:29'),
  ('35', '7', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0004', 'Created FG Request REQ-0004 | Date: 2026-09-08 18:00 | Urgency: Normal | Item: Finished Goods', NULL, '2026-09-08 12:07:43'),
  ('36', '8', 'LOGIN', 'AUTH', 'andrewk@stretchline.com', 'User Andrew Kristy (andrewk@stretchline.com) signed in successfully', NULL, '2026-09-08 12:21:00'),
  ('37', '7', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0005', 'Created FG Request REQ-0005 | Date: 2026-09-08 14:00 | Urgency: Normal | Item: Finished Goods', NULL, '2026-09-08 12:21:11'),
  ('38', '8', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0006', 'Created FG Request REQ-0006 | Date: 2026-09-08 14:00 | Urgency: Urgent | Item: Finished Goods', NULL, '2026-09-08 12:45:49'),
  ('39', '8', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0007', 'Created FG Request REQ-0007 | Date: 2026-09-08 14:00 | Urgency: Urgent | Item: Finished Goods', NULL, '2026-09-08 12:47:02'),
  ('40', '8', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0008', 'Created FG Request REQ-0008 | Date: 2026-09-08 14:00 | Urgency: Normal | Item: Finished Goods', NULL, '2026-09-08 12:48:45'),
  ('41', '8', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0009', 'Created FG Request REQ-0009 | Date: 2026-09-08 14:00 | Urgency: Normal | Item: Finished Goods', NULL, '2026-09-08 12:51:58'),
  ('42', '6', 'CREATE_LOCATION', 'MASTER_DATA', 'BRANDIX - AVISSAWELLA', 'Created Location BRANDIX - AVISSAWELLA (CUSTOMER)', NULL, '2026-09-08 12:52:29'),
  ('43', '8', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0010', 'Created FG Request REQ-0010 | Date: 2026-09-08 14:00 | Urgency: Normal | Item: Greige', NULL, '2026-09-08 12:57:08'),
  ('44', '8', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0011', 'Created FG Request REQ-0011 | Date: 2026-09-08 14:00 | Urgency: Normal | Item: Finished Goods', NULL, '2026-09-08 12:58:12'),
  ('45', '7', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0012', 'Created FG Request REQ-0012 | Date: 2026-09-08 18:00 | Urgency: Normal | Item: Finished Goods', NULL, '2026-09-08 13:07:43'),
  ('46', '6', 'UPDATE_LOCATION', 'MASTER_DATA', 'EFL - PELIYAGODA (KREEDA)', 'Updated Location EFL - PELIYAGODA (KREEDA) (WAREHOUSE)', NULL, '2026-09-08 13:10:58'),
  ('47', '6', 'UPDATE_LOCATION', 'MASTER_DATA', 'EFL KANDANA (KREEDA)', 'Updated Location EFL KANDANA (KREEDA) (CUSTOMER)', NULL, '2026-09-08 13:11:18'),
  ('48', '7', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0013', 'Created FG Request REQ-0013 | Date: 2026-09-08 15:00 | Urgency: Normal | Item: Finished Goods', NULL, '2026-09-08 13:13:30'),
  ('49', '6', 'SINGLE_ALLOCATE', 'ALLOCATION', 'TRIP-0005', 'Allocated Request REQ-0013 to Trip TRIP-0005 | Vehicle: 68-3470 | Driver: Wijethunga | Route: STR 1 - BIYAGAMA -> LINEA CLOTHING PALLEKALE | Distance: 239 km', NULL, '2026-09-08 13:15:12'),
  ('50', '8', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0014', 'Created FG Request REQ-0014 | Date: 2026-09-08 15:00 | Urgency: Normal | Item: Finished Goods', NULL, '2026-09-08 13:23:35');
INSERT INTO "activity_logs" ("id", "user_id", "action", "module", "record_id", "details", "ip_address", "created_at") VALUES
  ('51', '7', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0015', 'Created FG Request REQ-0015 | Date: 2026-09-08 16:00 | Urgency: Normal | Item: Finished Goods', NULL, '2026-09-08 13:27:29'),
  ('52', '6', 'AUTO_CREATE_DIRECT_ROUTE', 'MASTER_DATA', 'STR 2 - MT LAVINIA -> BRANDIX - AVISSAWELLA', 'Auto-created direct route RTE-0005 (STR 2 - MT LAVINIA -> BRANDIX - AVISSAWELLA) with standard distance 48 KM from RTE-0004', NULL, '2026-09-08 13:28:45'),
  ('53', '6', 'AUTO_CREATE_DIRECT_ROUTE', 'MASTER_DATA', 'STR 2 - MT LAVINIA -> SYNERGY AWISSAWELLA', 'Auto-created direct route RTE-0006 (STR 2 - MT LAVINIA -> SYNERGY AWISSAWELLA) with standard distance 48 KM from RTE-0004', NULL, '2026-09-08 13:28:45'),
  ('54', '6', 'COMBINE_ALLOCATE', 'ALLOCATION', 'TRIP-0006', 'Created Combine Trip TRIP-0006 with 2 requests (REQ-0008, REQ-0011) | Vehicle: LM-1621 | Driver: Sajith | Route: STR 2 - MT LAVINIA -> BRANDIX - AVISSAWELLA -> SYNERGY AWISSAWELLA | Distance: 98 km', NULL, '2026-09-08 13:29:38'),
  ('55', '6', 'AUTO_CREATE_DIRECT_ROUTE', 'MASTER_DATA', 'STR 2 - MT LAVINIA -> BENJI BINGIRIYA', 'Auto-created direct route RTE-0008 (STR 2 - MT LAVINIA -> BENJI BINGIRIYA) with standard distance 97 KM from RTE-0007', NULL, '2026-09-08 14:22:28'),
  ('56', '6', 'AUTO_CREATE_DIRECT_ROUTE', 'MASTER_DATA', 'STR 2 - MT LAVINIA -> BRANDIX (BLI) WATHUPITIWALA', 'Auto-created direct route RTE-0009 (STR 2 - MT LAVINIA -> BRANDIX (BLI) WATHUPITIWALA) with standard distance 58 KM from RTE-0007', NULL, '2026-09-08 14:22:28'),
  ('57', '6', 'COMBINE_ALLOCATE', 'ALLOCATION', 'TRIP-0007', 'Created Combine Trip TRIP-0007 with 2 requests (REQ-0006, REQ-0007) | Vehicle: LK-6471 | Driver: Manjula | Route: STR 2 - MT LAVINIA -> BENJI BINGIRIYA -> BRANDIX (BLI) WATHUPITIWALA | Distance: 224 km', NULL, '2026-09-08 14:22:36'),
  ('58', '6', 'DELETE_REQUEST', 'REQUESTS', 'REQ-0014', 'Deleted Request REQ-0014 | Reason: Duplicate entry / Created by mistake', NULL, '2026-09-08 14:26:48'),
  ('59', '6', 'COMBINE_ALLOCATE', 'ALLOCATION', 'TRIP-0008', 'Created Combine Trip TRIP-0008 with 2 requests (REQ-0009, REQ-0010) | Vehicle: 47-9845 | Driver: Ranasinghe | Route: STR 2 - MT LAVINIA -> STR 1 - BIYAGAMA | Distance: 62 km', NULL, '2026-09-08 14:29:36'),
  ('60', '6', 'SINGLE_ALLOCATE', 'ALLOCATION', 'TRIP-0009', 'Allocated Request REQ-0012 to Trip TRIP-0009 | Vehicle: 227-7072 | Driver: Kumara | Route: STR 1 - BIYAGAMA -> HORANA BODYLINE | Distance: 88 km', NULL, '2026-09-08 14:34:10'),
  ('61', '6', 'SINGLE_ALLOCATE', 'ALLOCATION', 'TRIP-0010', 'Allocated Request REQ-0004 to Trip TRIP-0010 | Vehicle: GE-5975 | Driver: Layanal | Route: STR 1 - BIYAGAMA -> BRANDIX - ADVANTIS KOTUGODA | Distance: 69 km', NULL, '2026-09-08 14:37:26'),
  ('62', '6', 'COMPLETE_TRIP', 'TRIPS', 'TRIP-0001', 'Completed Trip TRIP-0001 | Vehicle: 227-3502 | Driver: Senapala', NULL, '2026-09-08 14:44:36'),
  ('63', '6', 'COMPLETE_TRIP', 'TRIPS', 'TRIP-0005', 'Completed Trip TRIP-0005 | Vehicle: 68-3470 | Driver: Wijethunga', NULL, '2026-09-08 14:44:56'),
  ('64', '6', 'COMPLETE_TRIP', 'TRIPS', 'TRIP-0006', 'Completed Trip TRIP-0006 | Vehicle: LM-1621 | Driver: Sajith', NULL, '2026-09-08 14:45:06'),
  ('65', '6', 'COMPLETE_TRIP', 'TRIPS', 'TRIP-0007', 'Completed Trip TRIP-0007 | Vehicle: LK-6471 | Driver: Manjula', NULL, '2026-09-08 14:45:19'),
  ('66', '6', 'COMPLETE_TRIP', 'TRIPS', 'TRIP-0008', 'Completed Trip TRIP-0008 | Vehicle: 47-9845 | Driver: Ranasinghe', NULL, '2026-09-08 14:45:55'),
  ('67', '6', 'DELETE_REQUEST', 'REQUESTS', 'REQ-0005', 'Deleted Request REQ-0005 | Reason: Duplicate entry / Created by mistake', NULL, '2026-09-08 14:46:39'),
  ('68', '8', 'AUTO_LOGOUT', 'AUTH', '8', 'Session automatically timed out due to inactivity', '124.43.66.69', '2026-09-08 14:57:38'),
  ('69', '8', 'LOGIN', 'AUTH', 'andrewk@stretchline.com', 'User Andrew Kristy (andrewk@stretchline.com) signed in successfully', NULL, '2026-09-08 14:57:45'),
  ('70', '1', 'FULL_BACKUP', 'SETTINGS', NULL, 'Downloaded full database SQL backup', NULL, '2026-09-08 14:58:30'),
  ('71', '1', 'EXPORT_CSV', 'SETTINGS', NULL, 'Exported all database tables as CSV Zip Package', NULL, '2026-09-08 14:58:33'),
  ('72', '7', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0016', 'Created FG Request REQ-0016 | Date: 2026-09-08 17:00 | Urgency: Normal | Item: Finished Goods', NULL, '2026-09-08 15:12:41'),
  ('73', '7', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0017', 'Created FG Request REQ-0017 | Date: 2026-09-08 17:00 | Urgency: Normal | Item: Finished Goods', NULL, '2026-09-08 15:15:10'),
  ('74', '7', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0018', 'Created FG Request REQ-0018 | Date: 2026-09-08 17:00 | Urgency: Normal | Item: Finished Goods', NULL, '2026-09-08 15:19:00'),
  ('75', '6', 'AUTO_CREATE_DIRECT_ROUTE', 'MASTER_DATA', 'STR 1 - BIYAGAMA -> SYNERGY AWISSAWELLA', 'Auto-created direct route RTE-0014 (STR 1 - BIYAGAMA -> SYNERGY AWISSAWELLA) with standard distance 33 KM from RTE-0013', NULL, '2026-09-08 15:25:03'),
  ('76', '6', 'AUTO_CREATE_DIRECT_ROUTE', 'MASTER_DATA', 'STR 1 - BIYAGAMA -> BRANDIX - AVISSAWELLA', 'Auto-created direct route RTE-0015 (STR 1 - BIYAGAMA -> BRANDIX - AVISSAWELLA) with standard distance 33 KM from RTE-0013', NULL, '2026-09-08 15:25:03'),
  ('77', '6', 'COMBINE_ALLOCATE', 'ALLOCATION', 'TRIP-0011', 'Created Combine Trip TRIP-0011 with 2 requests (REQ-0016, REQ-0018) | Vehicle: DAB -0669 | Driver: Nishantha | Route: STR 1 - BIYAGAMA -> SYNERGY AWISSAWELLA -> BRANDIX - AVISSAWELLA | Distance: 68 km', NULL, '2026-09-08 15:25:10'),
  ('78', '7', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0019', 'Created FG Request REQ-0019 | Date: 2026-09-08 19:00 | Urgency: Normal | Item: Finished Goods', NULL, '2026-09-08 15:25:47'),
  ('79', '6', 'AUTO_CREATE_DIRECT_ROUTE', 'MASTER_DATA', 'STR 1 - BIYAGAMA -> EXPO KADANA', 'Auto-created direct route RTE-0017 (STR 1 - BIYAGAMA -> EXPO KADANA) with standard distance 53 KM from RTE-0016', NULL, '2026-09-08 15:36:14'),
  ('80', '6', 'AUTO_CREATE_DIRECT_ROUTE', 'MASTER_DATA', 'STR 1 - BIYAGAMA -> NARAMMALA - JINADASA', 'Auto-created direct route RTE-0018 (STR 1 - BIYAGAMA -> NARAMMALA - JINADASA) with standard distance 149 KM from RTE-0016', NULL, '2026-09-08 15:36:14'),
  ('81', '6', 'COMBINE_ALLOCATE', 'ALLOCATION', 'TRIP-0012', 'Created Combine Trip TRIP-0012 with 2 requests (REQ-0015, REQ-0017) | Vehicle: PY-3548 | Driver: Shantha | Route: STR 1 - BIYAGAMA -> EXPO KADANA -> NARAMMALA - JINADASA | Distance: 156 km', NULL, '2026-09-08 15:36:32'),
  ('82', '1', 'AUTO_LOGOUT', 'AUTH', '1', 'Session automatically timed out due to inactivity', '123.231.118.146', '2026-09-08 16:15:34'),
  ('83', '1', 'LOGIN', 'AUTH', 'superadmin@str.com', 'User Isuru Ranasinghe (superadmin@str.com) signed in successfully', NULL, '2026-09-08 16:15:36'),
  ('84', '6', 'UPDATE_USER', 'SETTINGS', 'USR-0007', 'Updated User Profile USR-0007 (Ravihari Thennakoon, raviharit@stretchline.com) | Role: ENTRY_USER', NULL, '2026-09-08 16:16:25'),
  ('85', '6', 'DISCARD_TRIP', 'ALLOCATION', 'TRIP-11', 'Discarded Trip #11 and reverted 2 request(s) back to SUBMITTED status', NULL, '2026-09-08 16:58:36'),
  ('86', '6', 'LOGIN', 'AUTH', 'susithf@stretchline.com', 'User Susith Fernando (susithf@stretchline.com) signed in successfully', NULL, '2026-09-08 19:02:57'),
  ('87', '7', 'AUTO_LOGOUT', 'AUTH', '7', 'Session automatically timed out due to inactivity', '103.247.48.191', '2026-09-08 19:39:33'),
  ('88', '6', 'FULL_BACKUP', 'SETTINGS', NULL, 'Downloaded full database SQL backup', NULL, '2026-09-08 21:35:46'),
  ('89', '6', 'AUTO_LOGOUT', 'AUTH', '6', 'Session automatically timed out due to inactivity', '203.94.66.50', '2026-09-09 07:47:34'),
  ('90', '6', 'LOGIN', 'AUTH', 'susithf@stretchline.com', 'User Susith Fernando (susithf@stretchline.com) signed in successfully', NULL, '2026-09-09 07:47:51'),
  ('91', '6', 'COMBINE_ALLOCATE', 'ALLOCATION', 'TRIP-0013', 'Created Combine Trip TRIP-0013 with 2 requests (REQ-0016, REQ-0018) | Vehicle: DAB -0669 | Driver: Nishantha | Route: STR 1 - BIYAGAMA -> SYNERGY AWISSAWELLA -> BRANDIX - AVISSAWELLA | Distance: 68 km', NULL, '2026-09-09 07:48:57'),
  ('92', '6', 'SINGLE_ALLOCATE', 'ALLOCATION', 'TRIP-0014', 'Allocated Request REQ-0019 to Trip TRIP-0014 | Vehicle: 48-1015 | Driver: Chaminda | Route: STR 1 - BIYAGAMA -> EFL - PELIYAGODA (KREEDA) | Distance: 40 km', NULL, '2026-09-09 07:50:43'),
  ('93', '6', 'COMPLETE_TRIP', 'TRIPS', 'TRIP-0009', 'Completed Trip TRIP-0009 | Vehicle: 227-7072 | Driver: Kumara', NULL, '2026-09-09 07:52:35'),
  ('94', '6', 'COMPLETE_TRIP', 'TRIPS', 'TRIP-0012', 'Completed Trip TRIP-0012 | Vehicle: PY-3548 | Driver: Shantha', NULL, '2026-09-09 07:52:48'),
  ('95', '7', 'LOGIN', 'AUTH', 'raviharit@stretchline.com', 'User Ravihari Thennakoon (raviharit@stretchline.com) signed in successfully', NULL, '2026-09-09 08:18:38'),
  ('96', '7', 'CREATE_REQUEST', 'REQUESTS', 'REQ-0020', 'Created FG Request REQ-0020 | Date: 2026-09-09 10:00 | Urgency: Normal | Item: Finished Goods', NULL, '2026-09-09 08:22:37'),
  ('97', '6', 'SINGLE_ALLOCATE', 'ALLOCATION', 'TRIP-0015', 'Allocated Request REQ-0020 to Trip TRIP-0015 | Vehicle: 68-3470 | Driver: Wijethunga | Route: STR 1 - BIYAGAMA -> UNICHELA MILK RUN - SCANWELL | Distance: 46 km', NULL, '2026-09-09 08:54:14'),
  ('98', '1', 'LOGIN', 'AUTH', 'superadmin@str.com', 'User Isuru Ranasinghe (superadmin@str.com) signed in successfully', NULL, '2026-09-09 08:54:46'),
  ('99', '1', 'FULL_BACKUP', 'SETTINGS', NULL, 'Downloaded full database SQL backup', NULL, '2026-09-09 08:54:53'),
  ('100', '1', 'EXPORT_CSV', 'SETTINGS', NULL, 'Exported all database tables as CSV Zip Package', NULL, '2026-09-09 08:54:57');
INSERT INTO "activity_logs" ("id", "user_id", "action", "module", "record_id", "details", "ip_address", "created_at") VALUES
  ('101', '6', 'DISCARD_TRIP', 'ALLOCATION', 'TRIP-15', 'Discarded Trip #15 and reverted 1 request(s) back to SUBMITTED status', NULL, '2026-09-09 08:58:35'),
  ('102', '6', 'SINGLE_ALLOCATE', 'ALLOCATION', 'TRIP-0015', 'Allocated Request REQ-0020 to Trip TRIP-0015 | Vehicle: GB-6111 | Driver: Viraj | Route: STR 1 - BIYAGAMA -> UNICHELA MILK RUN - SCANWELL | Distance: 46 km', NULL, '2026-09-09 08:58:57'),
  ('103', '6', 'LOGOUT', 'AUTH', 'susithf@stretchline.com', 'User Susith Fernando signed out', NULL, '2026-09-09 08:59:33'),
  ('104', '1', 'FULL_BACKUP', 'SETTINGS', NULL, 'Downloaded full database SQL backup', NULL, '2026-09-09 09:01:03'),
  ('105', '1', 'AUTO_LOGOUT', 'AUTH', '1', 'Session automatically timed out due to inactivity', '203.94.66.50', '2026-09-09 12:41:39'),
  ('106', '6', 'AUTO_LOGOUT', 'AUTH', '6', 'Session automatically timed out due to inactivity', '123.231.118.146', '2026-09-09 14:43:16'),
  ('107', '6', 'AUTO_LOGOUT', 'AUTH', '6', 'Session automatically timed out due to inactivity', '203.94.66.50', '2026-09-09 14:43:16'),
  ('108', '7', 'AUTO_LOGOUT', 'AUTH', '7', 'Session automatically timed out due to inactivity', '203.94.66.50', '2026-09-09 17:18:45'),
  ('109', '7', 'AUTO_LOGOUT', 'AUTH', '7', 'Session automatically timed out due to inactivity', '43.252.15.204', '2026-09-10 05:53:12'),
  ('110', '6', 'AUTO_LOGOUT', 'AUTH', '6', 'Session automatically timed out due to inactivity', '203.94.66.50', '2026-09-10 07:51:51'),
  ('111', '6', 'AUTO_LOGOUT', 'AUTH', '6', 'Session automatically timed out due to inactivity', '124.43.13.83', '2026-09-10 10:00:23'),
  ('112', '1', 'AUTO_LOGOUT', 'AUTH', '1', 'Session automatically timed out due to inactivity', '203.94.66.50', '2026-09-10 12:18:02'),
  ('113', '8', 'AUTO_LOGOUT', 'AUTH', '8', 'Session automatically timed out due to inactivity', '124.43.66.69', '2026-09-10 12:41:45'),
  ('114', '6', 'AUTO_LOGOUT', 'AUTH', '6', 'Session automatically timed out due to inactivity', '43.250.240.239', '2026-09-10 14:32:58'),
  ('115', '8', 'AUTO_LOGOUT', 'AUTH', '8', 'Session automatically timed out due to inactivity', '124.43.66.69', '2026-09-10 15:47:40'),
  ('116', '8', 'AUTO_LOGOUT', 'AUTH', '8', 'Session automatically timed out due to inactivity', '124.43.13.83', '2026-09-10 18:35:58'),
  ('117', '8', 'AUTO_LOGOUT', 'AUTH', '8', 'Session automatically timed out due to inactivity', '124.43.13.83', '2026-09-10 20:41:29');

-- Table: audit_logs (0 records)

-- =============================================================================
-- Reset Serial Sequences to Max IDs
-- =============================================================================
SELECT setval(pg_get_serial_sequence('"roles"', 'id'), COALESCE((SELECT MAX(id) FROM "roles"), 1));
SELECT setval(pg_get_serial_sequence('"plants"', 'id'), COALESCE((SELECT MAX(id) FROM "plants"), 1));
SELECT setval(pg_get_serial_sequence('"operations"', 'id'), COALESCE((SELECT MAX(id) FROM "operations"), 1));
SELECT setval(pg_get_serial_sequence('"master_categories"', 'id'), COALESCE((SELECT MAX(id) FROM "master_categories"), 1));
SELECT setval(pg_get_serial_sequence('"system_settings"', 'id'), COALESCE((SELECT MAX(id) FROM "system_settings"), 1));
SELECT setval(pg_get_serial_sequence('"monthly_fuel_rates"', 'id'), COALESCE((SELECT MAX(id) FROM "monthly_fuel_rates"), 1));
SELECT setval(pg_get_serial_sequence('"mail_templates"', 'id'), COALESCE((SELECT MAX(id) FROM "mail_templates"), 1));
SELECT setval(pg_get_serial_sequence('"master_data"', 'id'), COALESCE((SELECT MAX(id) FROM "master_data"), 1));
SELECT setval(pg_get_serial_sequence('"locations"', 'id'), COALESCE((SELECT MAX(id) FROM "locations"), 1));
SELECT setval(pg_get_serial_sequence('"users"', 'id'), COALESCE((SELECT MAX(id) FROM "users"), 1));
SELECT setval(pg_get_serial_sequence('"user_permissions"', 'id'), COALESCE((SELECT MAX(id) FROM "user_permissions"), 1));
SELECT setval(pg_get_serial_sequence('"vehicles"', 'id'), COALESCE((SELECT MAX(id) FROM "vehicles"), 1));
SELECT setval(pg_get_serial_sequence('"drivers"', 'id'), COALESCE((SELECT MAX(id) FROM "drivers"), 1));
SELECT setval(pg_get_serial_sequence('"routes"', 'id'), COALESCE((SELECT MAX(id) FROM "routes"), 1));
SELECT setval(pg_get_serial_sequence('"route_stops"', 'id'), COALESCE((SELECT MAX(id) FROM "route_stops"), 1));
SELECT setval(pg_get_serial_sequence('"vehicle_requests"', 'id'), COALESCE((SELECT MAX(id) FROM "vehicle_requests"), 1));
SELECT setval(pg_get_serial_sequence('"delivery_trips"', 'id'), COALESCE((SELECT MAX(id) FROM "delivery_trips"), 1));
SELECT setval(pg_get_serial_sequence('"trip_gate_passes"', 'id'), COALESCE((SELECT MAX(id) FROM "trip_gate_passes"), 1));
SELECT setval(pg_get_serial_sequence('"trip_reconciliations"', 'id'), COALESCE((SELECT MAX(id) FROM "trip_reconciliations"), 1));
SELECT setval(pg_get_serial_sequence('"notifications"', 'id'), COALESCE((SELECT MAX(id) FROM "notifications"), 1));
SELECT setval(pg_get_serial_sequence('"activity_logs"', 'id'), COALESCE((SELECT MAX(id) FROM "activity_logs"), 1));
SELECT setval(pg_get_serial_sequence('"audit_logs"', 'id'), COALESCE((SELECT MAX(id) FROM "audit_logs"), 1));

COMMIT;
