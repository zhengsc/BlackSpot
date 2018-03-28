
(function(win, undefined) {
	var e = function(selector) {
		return document.querySelector(selector)
	}

	var RAF = (function() {
		return win.requestAnimationFrame || win.webkitRequestAnimationFrame || function(fn) {
				setTimeout(fn, 1000 / 60)
			}
	})()

	var once = function(fn) {
		return function() {
			if(fn) {
				fn.call(this)
				fn = null
			}
		}
	}

	Element.prototype.on = function(type, fn) {
		this.addEventListener(type, fn)
	}

	Element.prototype.getSize = function() {
		return this.getBoundingClientRect()
	}

	Element.prototype.setStyle = function(style) {
		for(var j in style) {
			if(style.hasOwnProperty(j)) {
				this.style[j] = style[j]
			}
		}
	}

	Function.prototype.bind = Function.prototype.bind || function(self) {
		var _this = this
		var args = Array.prototype.slice.call(arguments, 1)

		return function() {
			_this.apply(self, args.concat(Array.prototype.slice.call(arguments)))
		}
	}

	Object.prototype.extend = function() {
		if(arguments.length < 1) return 
		var lists = Array.prototype.slice.call(arguments)
		var item = null

		for(var i = 0; i < lists.length; i++) {
			item = lists[i]

			for(var j in item) {
				if(item.hasOwnProperty(j)) {
					this[j] = item[j]
				}
			}
		}

		return this
	}

	var BlackSpot = function() {
		this.spot = null // 元素
		this.isTouchSpot = false // 是否触摸到元素
		this.isRunning = false // 是否正在执行动画
		this.winWidth = win.innerWidth // 屏幕的宽度
		this.winHeight = win.innerHeight // 屏幕的高度
		this.startPos = null, // 开始触摸时的坐标
		this.config = {
			isAuto: true, 
			adsorbDistance: 0, 
			time: 200, 
			timingFn: '', 
			boundary: false,
			beforeMove: null,
			afterMove: null 
		}
	}

	BlackSpot.prototype = {
		constructor: BlackSpot,

		touchStart: function(event) {
			if(this.isRunning) return 

			this.isTouchSpot = true

			var beforeMove = this.config.beforeMove

			var touches = event.changedTouches[0]

			if(typeof beforeMove === 'function') {
				this.spot.on('touchmove', once(beforeMove))
			}

			this.startPos = {
				x: touches.clientX,
				y: touches.clientY
			}
		},

		touchMove: function(event) {
			var _this = this
			var touches = event.changedTouches[0]

			RAF(function() {
				if(!_this.isTouchSpot) return 

				// 移动元素位置的时候需要减去触摸点与元素的左上角位置的差值
				var left = touches.clientX - _this.spotSize.left - _this.spotSize.width / 2
				var top = touches.clientY - _this.spotSize.top - _this.spotSize.height / 2

				_this.spot.setStyle({transform: ('translate('+ left +'px, '+ top +'px)')})
			})

			event.preventDefault()
			event.stopPropagation()
		},

		touchEnd: function(event) {
			if(this.isRunning) return

			var touches = event.changedTouches[0]

			this.isTouchSpot = false

			// 如果start和end的坐标变化小于1px，不执行动画
			if(Math.abs(touches.clientX - this.startPos.x) <= 1 && 
				Math.abs(touches.clientY === this.startPos.y) <= 1) return

			this.calDistanceFromBoundary()
		},

		/* 
		 * 计算元素距四个边距的距离
		 */
		calDistanceFromBoundary: function() {
			var touchendOffset = this.spot.getSize()

			var distances = {
				left: touchendOffset.left,
				top: touchendOffset.top,
				right: this.winWidth - touchendOffset.right,
				bottom: this.winHeight - touchendOffset.bottom,
				width: touchendOffset.width,
				height: touchendOffset.height
			}

			var direction = this.calAdsorbDirection(distances)

			if(!this.config.isAuto) {
				// 边界检测
				if(touchendOffset.top < 0) {
					direction = 'top'
				} else if(touchendOffset.left < 0) {
					direction = 'left'
				} else if(touchendOffset.bottom > this.winHeight) {
					direction = 'bottom'
				} else if(touchendOffset.right > this.winWidth) {
					direction = 'right'
				} else {
					// 没有超出边界，直接return 不需要吸附
					return 
				}
			}

			this.runningToBoundary(direction, distances)
		},

		/* 
		 * 获取运动终点坐标
		 * @param {String} dir 运动方向
		 * @param {Object} distance 距各个方向距离及自身尺寸
		 */
		getEndPos: function(dir, distance) {
			var _this = this
			var transformStyle = null
			var time = this.config.time / 1000 + 's'
			var timingFn = this.config.timingFn
			var size = _this.spotSize
			var ww = _this.winWidth
			var wh = _this.winHeight
			var x = 0, y = 0

			var transitionStyle = {
				transition: 'transform ' + time + ' ' + timingFn,
				webkitTransition: 'transform ' + time + ' ' + timingFn
			}

			/*
			 * 在计算需要回弹的位置时，需要用终点坐标分别减去原始位置的坐标
			 */
			var runMap = {
				top: function() {

					if(distance.right < 0) {
						x = ww - size.right
					} else if (distance.left < 0) {
						x = -size.left
					} else {
						x = distance.left - size.left
					}

					y = -size.top

					return {
						transform: 'translate('+ x +'px, '+ y +'px)',
						webkitTransform: 'translate('+ x +'px, '+ y +'px)'
					}
					
				},
				left: function() {
					x = -size.left

					if(distance.top < 0) {
						y = -size.top
					} else if(distance.top + size.height > wh) {
						y = wh - size.bottom
					} else {
						y = distance.top - size.top
					}

					return {
						transform: 'translate('+ x +'px, '+ y +'px)',
						webkitTransform: ('translate('+ x +'px, '+ y +'px)')
					}
				},
				bottom: function() {
					if(distance.right < 0) {
						x = ww - size.right
					} else if (distance.left < 0) {
						x = -size.left
					} else {
						x = distance.left - size.left
					}

					y = wh - distance.height - size.top

					return {
						transform: 'translate('+ x +'px, '+ y +'px)',
						webkitTransform: 'translate('+ x +'px, '+ y +'px)'
					}
				},
				right: function() {
					x = ww - distance.width - size.left

					if(distance.top < 0) {
						y = -size.top
					} else if(distance.top + size.height > wh) {
						y = wh - size.bottom
					} else {
						y = distance.top - size.top
					}

					return {
						transform: 'translate('+ x +'px, '+ y +'px)',
						webkitTransform: 'translate('+ x +'px, '+ y +'px)'
					}
				}
			}

			if(typeof dir === 'object') {
				// 按top/bottom/0，left/right/0的顺序取值
				distance.top = dir.top !== undefined ? dir.top - size.top : dir.bottom !== undefined ? (this.winHeight - size.top - size.height - dir.bottom) : 0
				distance.left = dir.left !== undefined ? dir.left - size.left : dir.right !== undefined ? (this.winWidth - size.right - dir.right) : 0
			}

			if(typeof dir === 'string' && runMap[dir]) {
				transformStyle = runMap[dir]()
			} else {
				transformStyle = {
					transform: 'translate('+ distance.left +'px, '+ distance.top +'px)',
					webkitTransform: 'translate('+ distance.left +'px, '+ distance.top +'px)'
				}
			}

			return transitionStyle.extend(transformStyle)
		},

		/* 
		 * 运动到边界
		 * @param {String} dir 运动方向
		 * @param {Object} distance 距各个方向距离及自身尺寸
		 */
		runningToBoundary: function(dir, distance) {
			var _this = this
			var speed = _this.config.speed
			var time = this.config.time / 1000 + 's'
			var boundary = _this.config.boundary
			var style = this.getEndPos(boundary || dir, distance)

			_this.isRunning = true
			_this.spot.setStyle(style)
		},

		/*
		 * 计算需要吸附的方向
		 * @params {Object} distances 元素距四个边界的距离
		 */
		calAdsorbDirection: function(distances) {
			var adsorbDistance = this.config.adsorbDistance
			var dirList = [
				{
					dir: 'top',
					dis: distances.top
				},
				{
					dir: 'right',
					dis: distances.right
				},
				{
					dir: 'bottom',
					dis: distances.bottom
				},
				{
					dir: 'left',
					dis: distances.left
				}
			]

			if(adsorbDistance > 0) {
				// 优先吸附到上下边界
				if(distances.top <= adsorbDistance) {
					return 'top'
				} else if(distances.bottom <= adsorbDistance) {
					return 'bottom'
				} else {
					return (distances.left > distances.right ? 'right' : 'left')
				}
			} else {
				// 对四个方向的距离排序，取出最小值
				dirList.sort(function(x, y) {
					return x.dis - y.dis
				})

				return dirList[0].dir
			}
		},

		/* 
		 * 清除动画
		 */ 
		removeTransition: function() {
			this.spot.setStyle({
				transition: null,
				webkitTransition: null
			})

			this.isRunning = false

			typeof this.config.afterMove === 'function' && this.config.afterMove.call(this.spot)
		},

		bind: function() {
			var spot = this.spot

			spot.on('touchstart', this.touchStart.bind(this))

			spot.on('touchmove', this.touchMove.bind(this))

			spot.on('touchend', this.touchEnd.bind(this))

			spot.on('touchcancel', this.touchEnd.bind(this))

			spot.on('transitionend', this.removeTransition.bind(this))

			spot.on('webkitTransitionEnd', this.removeTransition.bind(this))
		},

		/* 
		 * 初始化函数
		 * @param {String} selector 元素选择符
		 * @params {Object} options 配置项
		 * @param {Boolean} isAuto 是否开启自动吸附
		 * @param {Number} adsorbDistance 若取值 > 0 则当元素距上下边界小于这个数值时，会优先吸附到上下边界
		 * 								  若取值 <= 0 则吸附到距四条边距离最小的一侧
		 * @param {Number} time 自动吸附到边界的动作时间，单位：ms
		 * @param {String} timingFn 吸附到边界的速度曲线，可取值：linear|ease|ease-in|ease-out|ease-in-out|cubic-bezier(n,n,n,n)
		 * @param {String|Object} boundary 强制吸附到某处，String类型可取值： top|right|bottom|left
		 *												  Object类型可取值： top|right|bottom|left
		 * @param {Function} beforeMove 开始移动时回调，this指向DOM元素
		 * @param {Function} AfterMove 结束动画时回调，this指向DOM元素
		 */
		init: function(selector, options) {
			var boundary = null

			if(!selector) {
				throw new Error('元素选择器不能为空')
			}

			if(options && typeof (boundary = options.boundary) === 'object') {
				for(var i in boundary) {
					if(boundary.hasOwnProperty(i) && typeof boundary[i] !== 'number') {
						throw new Error('若boundary为具体位置信息，则'+ i +'必须为Number类型')
					}
				}
			}

			this.spot = e(selector)

			if(typeof options === 'object') {
				for(var i in options) {
					if(options.hasOwnProperty(i)) {
						this.config[i] = options[i]
					}
				}
			}

			var size = this.spot.getSize()

			this.spotSize = size

			this.bind()
		}
	}

	win['BlackSpot'] = function() {
		var instance = new BlackSpot()
		instance.init.apply(instance, Array.prototype.slice.call(arguments, 0))
	}
})(window)