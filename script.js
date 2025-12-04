/* ------------------------------
 * 공용 네비게이션 & 히어로 인터랙션
 * ------------------------------ */
const bannerSources = {
  black: "image/main banner black.png",
  silver: "image/main banner silver.png",
  green: "image/main banner green.png",
};

function handleSearch(event) {
  event.preventDefault();
  const input = event.target.querySelector(".search-input");
  const keyword = input?.value.trim();

  if (!keyword) {
    alert("검색어를 입력해주세요.");
    return false;
  }

  alert(`'${keyword}' 관련 콘텐츠는 준비 중입니다.`);
  input.value = "";
  return false;
}

function highlightSelector(color) {
  document.querySelectorAll(".color-selector").forEach((btn) => {
    const btnColor = btn.dataset.color;
    btn.classList.toggle("active", btnColor === color);
  });
}

function changeBanner(color = "green", animate = true) {
  const heroBanner = document.getElementById("hero-banner");
  if (!heroBanner) return;

  const nextSrc = bannerSources[color] || bannerSources.green;
  const currentColor = heroBanner.dataset.currentColor;
  if (currentColor === color && heroBanner.src.includes(nextSrc)) return;

  heroBanner.dataset.currentColor = color;
  highlightSelector(color);

  if (animate) {
    heroBanner.classList.add("is-changing");
    setTimeout(() => {
      heroBanner.src = nextSrc;
      setTimeout(() => heroBanner.classList.remove("is-changing"), 150);
    }, 150);
  } else {
     heroBanner.src = nextSrc;
     heroBanner.classList.remove("is-changing");
  }
}

function initHeroMotion() {
  const heroSection = document.querySelector(".hero-section.index-hero");
  const heroBanner = document.getElementById("hero-banner");
  if (!heroSection || !heroBanner) return;

  heroSection.addEventListener("mousemove", (event) => {
    const rect = heroSection.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width - 0.5;
    const relY = (event.clientY - rect.top) / rect.height - 0.5;
    heroBanner.style.transform = `scale(1.02) translate(${relX * 18}px, ${relY * 10}px)`;
  });

  heroSection.addEventListener("mouseleave", () => {
    heroBanner.style.transform = "";
  });
}

function initColorSelectors() {
  const selectors = document.querySelectorAll(".color-selector[data-color]");
  if (!selectors.length) return;

  selectors.forEach((btn) => {
    const color = btn.dataset.color;
    if (!color) return;

    const activate = () => changeBanner(color);
    btn.addEventListener("click", activate);
    btn.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });
}

function initProductDiagramHover() {
  const diagram = document.querySelector(".product-diagram");
  if (!diagram) return;

  const points = diagram.querySelectorAll(".hover-point[data-label]");
  const labels = diagram.querySelectorAll(".feature-label[data-label]");
  const imageContainer = diagram.querySelector(".product-image-container");
  if (!points.length || !labels.length) return;

  const labelMap = {};
  labels.forEach((label) => {
    const key = label.dataset.label;
    if (key) {
      labelMap[key] = label;
    }
    label.classList.remove("active", "dimmed");
  });

  const setState = (targetKey) => {
    const hasTarget = Boolean(targetKey && labelMap[targetKey]);

    Object.entries(labelMap).forEach(([key, label]) => {
      const isActive = hasTarget && key === targetKey;
      label.classList.toggle("active", isActive);
      label.classList.toggle("dimmed", hasTarget && !isActive);
    });

    diagram.classList.toggle("is-interacting", hasTarget);
    imageContainer?.classList.toggle("highlighted", hasTarget);
  };

  const reset = () => setState(null);

  points.forEach((point) => {
    const key = point.dataset.label;
    if (!key) return;

    point.setAttribute("tabindex", "0");
    const activate = () => setState(key);

    point.addEventListener("mouseenter", activate);
    point.addEventListener("focus", activate);
    point.addEventListener("mouseleave", reset);
    point.addEventListener("blur", reset);
    point.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
      if (event.key === "Escape") {
        reset();
      }
    });
  });

  diagram.addEventListener("mouseleave", reset);
  diagram.addEventListener("focusout", (event) => {
    if (!diagram.contains(event.relatedTarget)) {
      reset();
    }
  });
}

function initBrainLabelDescriptions() {
  const labels = document.querySelectorAll(".brain-label[data-description]");
  if (!labels.length) return;

  labels.forEach((label) => {
    const description = label.dataset.description;
    if (!description || label.querySelector(".label-description")) return;

    const descriptionEl = document.createElement("div");
    descriptionEl.className = "label-description";
    descriptionEl.textContent = description;
    label.appendChild(descriptionEl);
  });
}

/* ------------------------------
 * Zoom 페이지 (Teachable Machine)
 * ------------------------------ */
const URL = "https://teachablemachine.withgoogle.com/models/pXAz37v4i/";
let model, webcam, ctx, labelContainer, maxPredictions;
let isRunning = false;

async function init() {
  if (typeof tmPose === "undefined") {
    console.warn("tmPose 라이브러리가 로드되지 않았습니다. zoom 페이지에서만 사용할 수 있습니다.");
    return;
  }

  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const canvas = document.getElementById("canvas");
  if (!startBtn || !stopBtn || !canvas) {
    console.warn("필수 요소가 없어 포즈 인식을 시작할 수 없습니다.");
    return;
  }

  try {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    model = await tmPose.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    const size = 200;
    const flip = true;
    webcam = new tmPose.Webcam(size, size, flip);
    await webcam.setup();
    await webcam.play();

    canvas.width = size;
    canvas.height = size;
    ctx = canvas.getContext("2d");

    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";
    for (let i = 0; i < maxPredictions; i++) {
      labelContainer.appendChild(document.createElement("div"));
    }

    startBtn.disabled = true;
    stopBtn.disabled = false;
    isRunning = true;

    window.requestAnimationFrame(loop);
  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
    alert("카메라 접근에 실패했습니다. 브라우저 설정을 확인해주세요.");
    stopCamera();
  }
}

function stopCamera() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const feedbackImage = document.getElementById("feedback-image");

  if (webcam) {
    webcam.stop();
    webcam = null;
  }

  isRunning = false;
  model = null;

  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
  if (feedbackImage) feedbackImage.style.display = "none";

  if (labelContainer) {
    labelContainer.innerHTML = "";
    labelContainer = null;
  }

  if (ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx = null;
  }
}

async function loop() {
  if (!isRunning || !webcam) return;

  webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

async function predict() {
  if (!model || !webcam) return;

  try {
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    const prediction = await model.predict(posenetOutput);

    let highestProb = 0;
    let predictedClass = "";

    prediction.forEach((item, index) => {
      const prob = item.probability;
      const className = item.className;

      if (prob > highestProb) {
        highestProb = prob;
        predictedClass = className;
      }

      if (labelContainer?.childNodes[index]) {
        labelContainer.childNodes[index].innerHTML = `${className}: ${prob.toFixed(2)}`;
      }
    });

    const feedbackImage = document.getElementById("feedback-image");
    if (feedbackImage) {
      if (predictedClass === "올바른 동작" && highestProb > 0.9) {
        feedbackImage.src = "image/success.jpg";
      } else {
        feedbackImage.src = "image/fail.jpg";
      }
      feedbackImage.style.display = "block";
    }

    drawPose(pose);
  } catch (error) {
    console.error("예측 중 오류 발생:", error);
  }
}

function drawPose(pose) {
  if (!pose || !ctx || !webcam?.canvas) return;

  ctx.drawImage(webcam.canvas, 0, 0);
  const minPartConfidence = 0.5;
  tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
  tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
}

/* ------------------------------
 * Scroll Reveal (공통)
 * ------------------------------ */
function initScrollReveal() {
  const revealTargets = document.querySelectorAll(".reveal");
  if (!revealTargets.length) return;

  const onIntersect = (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  };

  const observer = new IntersectionObserver(onIntersect, {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px",
  });

  revealTargets.forEach((el) => observer.observe(el));
}

/* ------------------------------
 * MyPage Control Setting 기능
 * ------------------------------ */
function initMypageControls() {
  // 초기 슬라이더 thumb 위치 설정
  const sliderFills = document.querySelectorAll(".mypage-slider-fill");
  sliderFills.forEach(fill => {
    const width = parseFloat(fill.style.width) || 0;
    const slider = fill.parentElement;
    const thumb = slider.querySelector(".mypage-slider-thumb");
    if (thumb) {
      thumb.style.left = `${width}%`;
    }
  });
  
  // 슬라이더 플러스/마이너스 버튼 기능
  const plusButtons = document.querySelectorAll(".mypage-plus-btn");
  const minusButtons = document.querySelectorAll(".mypage-minus-btn");
  
  plusButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const panel = btn.dataset.panel;
      const control = btn.dataset.control;
      adjustSlider(panel, control, 5);
    });
  });
  
  minusButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const panel = btn.dataset.panel;
      const control = btn.dataset.control;
      adjustSlider(panel, control, -5);
    });
  });
  
  // LED 색상 변경 기능
  const colorCircles = document.querySelectorAll(".mypage-color-circle");
  const handlePlaceholder = document.querySelector(".handle-placeholder");
  
  colorCircles.forEach(circle => {
    circle.addEventListener("click", () => {
      // 모든 active 클래스 제거
      colorCircles.forEach(c => c.classList.remove("mypage-color-active"));
      // 클릭한 원에 active 클래스 추가
      circle.classList.add("mypage-color-active");
      
      // 핸들 배경색 변경
      const glowColor = circle.dataset.glow;
      if (handlePlaceholder) {
        handlePlaceholder.className = `handle-placeholder glow-${glowColor}`;
        handlePlaceholder.setAttribute("data-glow-state", glowColor);
      }
    });
  });
}

function initMypageHeroTransition() {
  const heroSection = document.querySelector(".mypage-hero-section");
  const heroContent = heroSection?.querySelector(".hero-sticky");
  if (!heroSection || !heroContent) return;

  const updateFade = () => {
    const heroTop = heroSection.offsetTop;
    const heroHeight = heroSection.offsetHeight || window.innerHeight;
    const fadeDistance = Math.max(heroHeight * 0.7, 1);
    const scrolled = window.scrollY - heroTop;
    const progressRaw = scrolled / fadeDistance;
    const progress = Math.min(Math.max(progressRaw, 0), 1);

    heroContent.style.opacity = String(1 - progress);
    heroContent.style.transform = `translateY(${ -60 * progress }px)`;
    heroContent.classList.toggle("is-hidden", progress >= 0.98);
  };

  window.addEventListener("scroll", updateFade, { passive: true });
  window.addEventListener("resize", updateFade);
  updateFade();
}

function adjustSlider(panel, control, delta) {
  const sliderFill = document.querySelector(
    `.mypage-slider-fill[data-panel="${panel}"][data-control="${control}"]`
  );
  
  if (!sliderFill) return;
  
  const currentWidth = parseFloat(sliderFill.style.width) || 0;
  let newWidth = currentWidth + delta;
  
  // 0% ~ 100% 범위로 제한
  newWidth = Math.max(0, Math.min(100, newWidth));
  
  sliderFill.style.width = `${newWidth}%`;
  
  // 슬라이더 thumb 위치 업데이트
  const slider = sliderFill.parentElement;
  const thumb = slider.querySelector(".mypage-slider-thumb");
  if (thumb) {
    thumb.style.left = `${newWidth}%`;
  }
}

/* ------------------------------
 * Weekly Carousel 기능
 * ------------------------------ */
let weeklyCarouselCurrentIndex = 0;

function moveWeeklyCarousel(direction) {
  const carousel = document.getElementById("weeklyCarousel");
  const wrapper = carousel?.parentElement;
  const cards = carousel?.querySelectorAll(".weekly-report-card");
  const paginationFill = document.getElementById("weeklyPaginationFill");
  
  if (!carousel || !cards || cards.length === 0) return;
  
  const totalCards = cards.length;
  const cardWidth = cards[0].offsetWidth;
  const gap = 20; // CSS에서 설정한 gap 값
  const scrollAmount = cardWidth + gap;
  
  // 인덱스 업데이트
  weeklyCarouselCurrentIndex += direction;
  
  // 범위 제한
  if (weeklyCarouselCurrentIndex < 0) {
    weeklyCarouselCurrentIndex = 0;
  } else if (weeklyCarouselCurrentIndex >= totalCards) {
    weeklyCarouselCurrentIndex = totalCards - 1;
  }
  
  // 스크롤바 이동 (transform 대신 스크롤 사용)
  if (wrapper) {
    wrapper.scrollTo({
      left: weeklyCarouselCurrentIndex * scrollAmount,
      behavior: 'smooth'
    });
  }
  
  // 페이지네이션 업데이트
  if (paginationFill) {
    const fillPercentage = ((weeklyCarouselCurrentIndex + 1) / totalCards) * 100;
    paginationFill.style.width = `${fillPercentage}%`;
  }
}

function initWeeklyCarousel() {
  const carousel = document.getElementById("weeklyCarousel");
  const wrapper = carousel?.parentElement;
  const paginationFill = document.getElementById("weeklyPaginationFill");
  
  if (!carousel || !wrapper) return;
  
  // 스크롤 이벤트 리스너 추가
  let scrollTimeout;
  wrapper.addEventListener("scroll", () => {
    const cards = carousel.querySelectorAll(".weekly-report-card");
    if (cards.length === 0) return;
    
    const cardWidth = cards[0].offsetWidth;
    const gap = 20;
    const scrollAmount = cardWidth + gap;
    
    // 현재 스크롤 위치에 따라 인덱스 계산
    const newIndex = Math.round(wrapper.scrollLeft / scrollAmount);
    
    if (newIndex !== weeklyCarouselCurrentIndex && newIndex >= 0 && newIndex < cards.length) {
      weeklyCarouselCurrentIndex = newIndex;
      
      // 페이지네이션 업데이트
      if (paginationFill) {
        const fillPercentage = ((weeklyCarouselCurrentIndex + 1) / cards.length) * 100;
        paginationFill.style.width = `${fillPercentage}%`;
      }
    }
  }, { passive: true });
  
  // 초기 페이지네이션 설정
  const cards = carousel.querySelectorAll(".weekly-report-card");
  if (paginationFill && cards.length > 0) {
    const fillPercentage = ((weeklyCarouselCurrentIndex + 1) / cards.length) * 100;
    paginationFill.style.width = `${fillPercentage}%`;
  }
}

/* ------------------------------
 * 일일 리포트 날짜 네비게이션
 * ------------------------------ */
function initDateNavigation() {
  const dateItems = document.querySelectorAll(".date-item");
  if (!dateItems.length) return;
  
  dateItems.forEach(item => {
    item.addEventListener("click", () => {
      // 모든 active 클래스 제거
      dateItems.forEach(d => d.classList.remove("active"));
      // 클릭한 날짜에 active 클래스 추가
      item.classList.add("active");
    });
    
    // 키보드 접근성 추가
    item.setAttribute("tabindex", "0");
    item.setAttribute("role", "button");
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        item.click();
      }
    });
  });
}

/* ------------------------------
 * 초기화
 * ------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  // 히어로 영역 & 제품 다이어그램 효과
  initColorSelectors();
  changeBanner("green", false);
  initHeroMotion();
  initProductDiagramHover();
  initScrollReveal();
  initBrainLabelDescriptions();
  initMypageControls();
  initMypageHeroTransition();
  initWeeklyCarousel();
  initDateNavigation();

  const stopBtn = document.getElementById("stopBtn");
  if (stopBtn) stopBtn.disabled = true;
});

