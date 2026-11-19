import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AppRoutes } from "../shared/config/routes";
import Home from "../pages/Home";

const Gallery = lazy(() => import("../pages/Gallery"));
const Teams = lazy(() => import("../pages/Teams"));
const Reviews = lazy(() => import("../pages/Reviews"));
const Services = lazy(() => import("../pages/Services"));
const ServiceDetail = lazy(() => import("../pages/ServiceDetail"));
const Order = lazy(() => import("../pages/Order"));
const OrderStatus = lazy(() => import("../pages/OrderStatus"));
const NotFound = lazy(() => import("../pages/NotFound"));

const RouterProvider = () => (
  <BrowserRouter>
    <Suspense fallback={null}>
      <Routes>
        <Route path={AppRoutes.HOME} element={<Home />} />
        <Route path={AppRoutes.GALLERY} element={<Gallery />} />
        <Route path={AppRoutes.TEAMS} element={<Teams />} />
        <Route path={AppRoutes.REVIEWS} element={<Reviews />} />
        <Route path={AppRoutes.SERVICES} element={<Services />} />
        <Route path={AppRoutes.SERVICE_DETAIL} element={<ServiceDetail />} />
        <Route path={AppRoutes.ORDER} element={<Order />} />
        <Route path={AppRoutes.ORDER_STATUS} element={<OrderStatus />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default RouterProvider;
