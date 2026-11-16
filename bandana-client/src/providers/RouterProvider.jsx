import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AppRoutes } from "../shared/config/routes";
import Home from "../pages/Home";

const Gallery = lazy(() => import("../pages/Gallery"));
const Teams = lazy(() => import("../pages/Teams"));
const Reviews = lazy(() => import("../pages/Reviews"));
const NotFound = lazy(() => import("../pages/NotFound"));

const RouterProvider = () => (
  <BrowserRouter>
    <Suspense fallback={null}>
      <Routes>
        <Route path={AppRoutes.HOME} element={<Home />} />
        <Route path={AppRoutes.GALLERY} element={<Gallery />} />
        <Route path={AppRoutes.TEAMS} element={<Teams />} />
        <Route path={AppRoutes.REVIEWS} element={<Reviews />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default RouterProvider;
