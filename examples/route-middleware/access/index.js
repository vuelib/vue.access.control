import VueAccessControl from "vue.access.control";
import Vue from "vue";
import { AsyncStudentRoute, AsyncTeacherRoute } from "../router/routes";

Vue.use(VueAccessControl, {
  vueRouter: true
});

export default new VueAccessControl.Access({
  routes: AsyncTeacherRoute.concat(AsyncStudentRoute)
});