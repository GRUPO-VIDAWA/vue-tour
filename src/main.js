import VTour from './components/VTour'
import VStep from './components/VStep'
import VStepTip from './components/VStepTip'

const VueTour = {
  install (Vue, options) {
    Vue.component(VTour.name, VTour)
    Vue.component(VStep.name, VStep)
    Vue.component(VStepTip.name, VStepTip)

    // Object containing Tour objects (see VTour.vue) where the tour name is used as key
    Vue.prototype.$tours = {}
  }
}

export default VueTour

if (typeof window !== 'undefined' && window.Vue) {
  window.Vue.use(VueTour)
}
