<template>
    <div
      v-if="type === 'tip'"
      v-bind:class="{ 'v-step-tip--sticky': isSticky }"
      class="v-step-tip"
      :id="'v-step-tip' + hash"
      :ref="'v-step-tip' + hash"
    >
      <slot name="header">
        <div v-if="step.header" class="v-step-tip__header">
          <div v-if="step.header.title" v-html="step.header.title"></div>
        </div>
        <div v-if="!step.header" class="v-step-tip__header_empty">
          &nbsp;
        </div>
      </slot>

      <slot name="content">
        <div class="v-step-tip__content">
          <div v-if="step.content" v-html="step.content"></div>
          <div v-else>
            This is a demo step! The id of this step is {{ hash }} and it
            targets {{ step.target }}.
          </div>
        </div>
      </slot>

      <slot name="actions">
        <div class="v-step-tip__buttons">
          <button
            @click.prevent="skip"
            v-if="!isLast && isButtonEnabled('buttonSkip')"
            class="v-step-tip__button v-step-tip__button-skip"
          >
            {{ labels.buttonSkip }}
          </button>
          <button
            @click.prevent="previousStep"
            v-if="!isFirst && isButtonEnabled('buttonPrevious')"
            class="v-step-tip__button v-step-tip__button-previous"
          >
            {{ labels.buttonPrevious }}
          </button>
          <button
            @click.prevent="nextStep"
            v-if="!isLast && isButtonEnabled('buttonNext')"
            class="v-step-tip__button v-step-tip__button-next"
          >
            {{ labels.buttonNext }}
          </button>
          <button
            @click.prevent="finish"
            v-if="isLast && isButtonEnabled('buttonStop')"
            class="v-step-tip__button v-step-tip__button-stop"
          >
            {{ labels.buttonStop }}
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
  name: 'v-step-tip',
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
      default: 'normal' // Or "tip" / "normal"
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
    }
  },
  methods: {
    createStep () {
      if (this.debug) {
        console.log(
          '[Vue Tour] The target element ' +
            this.step.target +
            ' of .v-step[id="' +
            this.hash +
            '"] is:',
          this.targetElement
        )
      }

      if (this.isSticky) {
        document.body.appendChild(this.$refs['v-step-' + this.hash])
      } else {
        if (this.targetElement) {
          this.enableScrolling()
          this.createHighlight()

          createPopper(
            this.targetElement,
            this.$refs['v-step-' + this.hash],
            this.params
          )
        } else {
          if (this.debug) {
            console.error(
              '[Vue Tour] The target element ' +
                this.step.target +
                ' of .v-step[id="' +
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
          } for .v-step[id="${this.hash}"]`
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
.v-step-tip {
  background: #50596c; /* #ffc107, #35495e */
  color: white;
  max-width: 620px;
  width: 400px;
  height: 400px;
  border-radius: 3px;
  box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px,
    rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px;
  padding: 1rem;
  pointer-events: auto;
  text-align: center;
  z-index: 10000;

  &--sticky {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}

.v-step-tip[data-popper-placement^="top"] > .v-step__arrow {
  bottom: -5px;
}

.v-step-tip[data-popper-placement^="bottom"] > .v-step__arrow {
  top: -5px;
}

.v-step-tip[data-popper-placement^="right"] > .v-step__arrow {
  left: -5px;
}

.v-step-tip[data-popper-placement^="left"] > .v-step__arrow {
  right: -5px;
}

/* Custom */

.v-step-tip__header {
  margin: -1rem -1rem 0.5rem;
  padding: 0.5rem;
  background-color: #454d5d;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
}

.v-step-tip__header_empty {
  margin: -1rem -1rem 0.5rem;
  padding: 0.5rem;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
}

.v-step-tip__content {
  margin: 0 0 1rem 0;
  height: 100%;
  max-height: 270px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.v-step-tip__buttons {
    align-content: space-around;
}

.v-step-tip__button {
  background: transparent;
  border: 0.05rem solid white;
  border-radius: 0.1rem;
  color: white;
  cursor: pointer;
  display: inline-block;
  font-size: 0.8rem;
  height: 1.8rem;
  line-height: 1rem;
  outline: none;
  margin: 0 0.2rem;
  padding: 0.35rem 0.4rem;
  text-align: center;
  text-decoration: none;
  transition: all 0.2s ease;
  vertical-align: middle;
  white-space: nowrap;

  &:hover {
    background-color: rgba(white, 0.95);
    color: #50596c;
  }

  &-skip {
    position: absolute;
    left: 15px;
    border: none;
  }
}
</style>
