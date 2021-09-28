<template>
    <div
      v-if="type === 'contextHelp'"
      v-bind:class="{ 'v-step-context-help--rightAnchor': isRightAnchor }"
      class="v-step-context-help"
      :id="'v-step-context-help' + hash"
      :ref="'v-step-context-help' + hash"
    >
      <slot name="header">
        <div v-if="step.header" class="v-step-context-help__header">
          <div v-if="step.header.title" v-html="step.header.title"></div>
        </div>
        <div v-if="!step.header" class="v-step-context-help__header_empty">
          &nbsp;
        </div>
      </slot>

      <slot name="content">
        <div class="v-step-context-help__content">
          <div v-if="step.content" v-html="step.content"></div>
          <div v-else>
            This is a demo step! The id of this step is {{ hash }} and it
            targets {{ step.target }}.
          </div>
        </div>
      </slot>

      <slot name="actions">
        <div class="v-step-context-help__buttons">
          <button
            @click.prevent="skip"
            v-if="!isLast && isButtonEnabled('buttonSkip')"
            class="v-step-context-help__button v-step-context-help__button-skip"
          >
            <img src="@/assets/skipforward.png" v-if="labels.buttonSkip === ''" />
            <span v-if="labels.buttonSkip !== ''">{{ labels.buttonSkip }}</span>
          </button>
          <button
            @click.prevent="previousStep"
            v-if="!isFirst && isButtonEnabled('buttonPrevious')"
            class="v-step-context-help__button v-step-context-help__button-previous"
          >
            <img src="@/assets/previous.png" v-if="labels.buttonPrevious === ''" />
            <span v-if="labels.buttonPrevious !== ''">{{ labels.buttonPrevious }}</span>
          </button>
          <button
            @click.prevent="nextStep"
            v-if="!isLast && isButtonEnabled('buttonNext')"
            class="v-step-context-help__button v-step-context-help__button-next"
          >
            <img src="@/assets/next.png" v-if="labels.buttonNext === ''" />
            <span v-if="labels.buttonNext !== ''">{{ labels.buttonNext }}</span>
          </button>
          <button
            @click.prevent="finish"
            v-if="isLast && isButtonEnabled('buttonStop')"
            class="v-step-context-help__button v-step-context-help__button-stop"
          >
            <img src="@/assets/stop.png" v-if="labels.buttonStop === ''" />
            <span v-if="labels.buttonStop !== ''">{{ labels.buttonStop }}</span>
          </button>
        </div>
      </slot>
    </div>
</template>

<script>
import { createPopper } from '@popperjs/core'
import jump from 'jump.js'
import sum from 'hash-sum'
import { DEFAULT_STEP_OPTIONS, HIGHLIGHT } from '../shared/constants'

export default {
  name: 'v-step-context-help',
  props: {
    step: {
      type: Object
    },
    previousStep: {
      type: Function
    },
    nextStep: {
      type: Function
    },
    stop: {
      type: Function
    },
    skip: {
      type: Function
    },
    finish: {
      type: Function
    },
    isFirst: {
      type: Boolean
    },
    isLast: {
      type: Boolean
    },
    labels: {
      type: Object
    },
    enabledButtons: {
      type: Object
    },
    highlight: {
      type: Boolean
    },
    stopOnFail: {
      type: Boolean
    },
    debug: {
      type: Boolean
    },
    type: {
      type: String,
      default: 'contextHelp' // Or "tip" / "normal"
    }
  },
  data () {
    return {
      hash: sum(this.step.target),
      targetElement: document.querySelector(this.step.target)
    }
  },
  computed: {
    params () {
      return {
        ...DEFAULT_STEP_OPTIONS,
        ...{ highlight: this.highlight }, // Use global tour highlight setting first
        ...{ enabledButtons: Object.assign({}, this.enabledButtons) },
        ...this.step.params // Then use local step parameters if defined
      }
    },
    /**
     * A step is considered sticky if it has no target.
     */
    isSticky () {
      return true // !this.step.target
    },
    isRightAnchor () {
      return true // !this.step.target
    }
  },
  methods: {
    createStep () {
      if (this.debug) {
        console.log(
          '[Vue Tour] The target element ' +
            this.step.target +
            ' of .v-step-context-help[id="' +
            this.hash +
            '"] is:',
          this.targetElement
        )
      }

      if (this.isRightAnchor) {
        document.body.appendChild(this.$refs['v-step-context-help' + this.hash])
      } else {
        if (this.targetElement) {
          this.enableScrolling()
          this.createHighlight()

          createPopper(
            this.targetElement,
            this.$refs['v-step-context-help' + this.hash],
            this.params
          )
        } else {
          if (this.debug) {
            console.error(
              '[Vue Tour] The target element ' +
                this.step.target +
                ' of .v-step-context-help[id="' +
                this.hash +
                '"] does not exist!'
            )
          }
          this.$emit('targetNotFound', this.step)
          if (this.stopOnFail) {
            this.stop()
          }
        }
      }
    },
    enableScrolling () {
      if (this.params.enableScrolling) {
        if (this.step.duration || this.step.offset) {
          let jumpOptions = {
            duration: this.step.duration || 1000,
            offset: this.step.offset || 0,
            callback: undefined,
            a11y: false
          }

          jump(this.targetElement, jumpOptions)
        } else {
          // Use the native scroll by default if no scroll options has been defined
          this.targetElement.scrollIntoView({ behavior: 'smooth' })
        }
      }
    },
    isHighlightEnabled () {
      if (this.debug) {
        console.log(
          `[Vue Tour] Highlight is ${
            this.params.highlight ? 'enabled' : 'disabled'
          } for .v-step-context-help[id="${this.hash}"]`
        )
      }
      return this.params.highlight
    },
    createHighlight () {
      if (this.isHighlightEnabled()) {
        document.body.classList.add(HIGHLIGHT.classes.active)
        const transitionValue = window
          .getComputedStyle(this.targetElement)
          .getPropertyValue('transition')

        // Make sure our background doesn't flick on transitions
        if (transitionValue !== 'all 0s ease 0s') {
          this.targetElement.style.transition = `${transitionValue}, ${HIGHLIGHT.transition}`
        }

        this.targetElement.classList.add(HIGHLIGHT.classes.targetHighlighted)
        // The element must have a position, if it doesn't have one, add a relative position class
        if (!this.targetElement.style.position) {
          this.targetElement.classList.add(HIGHLIGHT.classes.targetRelative)
        }
      } else {
        document.body.classList.remove(HIGHLIGHT.classes.active)
      }
    },
    removeHighlight () {
      if (this.isHighlightEnabled()) {
        const target = this.targetElement
        const currentTransition = this.targetElement.style.transition
        this.targetElement.classList.remove(
          HIGHLIGHT.classes.targetHighlighted
        )
        this.targetElement.classList.remove(HIGHLIGHT.classes.targetRelative)
        // Remove our transition when step is finished.
        if (currentTransition.includes(HIGHLIGHT.transition)) {
          setTimeout(() => {
            target.style.transition = currentTransition.replace(
              `, ${HIGHLIGHT.transition}`,
              ''
            )
          }, 0)
        }
      }
    },
    isButtonEnabled (name) {
      return this.params.enabledButtons.hasOwnProperty(name)
        ? this.params.enabledButtons[name]
        : true
    }
  },
  mounted () {
    this.createStep()
  },
  destroyed () {
    this.removeHighlight()
  }
}
</script>

<style lang="scss" scoped>
.v-step-context-help {
  background: #50596c; /* #ffc107, #35495e */
  color: white;
  max-width: 200px;
  width: 200px;
  height: 400px;
  border-radius: 3px;
  box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px,
    rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px;
  padding: 1rem;
  pointer-events: auto;
  text-align: center;

  &--sticky {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10000;
}

  &--rightAnchor {
    position: absolute;
    z-index: 9999;
    top: 0px;
    right: 0px;
    border-radius: 0px;
    height: 100vh;
  }
}

.v-step-context-help[data-popper-placement^="top"] > .v-step__arrow {
  bottom: -5px;
}

.v-step-context-help[data-popper-placement^="bottom"] > .v-step__arrow {
  top: -5px;
}

.v-step-context-help[data-popper-placement^="right"] > .v-step__arrow {
  left: -5px;
}

.v-step-context-help[data-popper-placement^="left"] > .v-step__arrow {
  right: -5px;
}

/* Custom */

.v-step-context-help__header {
  margin: -1rem -1rem 0.5rem;
  padding: 0.5rem;
  background-color: #454d5d;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
}

.v-step-context-help__header_empty {
  margin: -1rem -1rem 0.5rem;
  padding: 0.5rem;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
}

.v-step-context-help__content {
  margin: 0 0 1rem 0;
  height: calc(100vh - 150px);
  max-height: calc(100vh - 150px);
  display: flex;
  vertical-align: top;
  justify-content: center;
}

.v-step-context-help__buttons {
    top: 10px;
}

.v-step-context-help__button {
  background: transparent;
  border:none;
  cursor: pointer;
  display: inline-block;
  font-size: 0.8rem;
  height: 1.8rem;
  line-height: 1rem;
  margin: 0 0.2rem;
  padding: 0.35rem 0.4rem;
  text-align: center;
  text-decoration: none;
  transition: all 0.2s ease;
  vertical-align: middle;
  white-space: nowrap;

  &:hover {
    stroke: #fff;
  }

  &-skip {
    position: absolute;
    left: 15px;
    border: none;
  }
}
</style>
