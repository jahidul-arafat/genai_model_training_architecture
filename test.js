// Draggable Panel Manager - Fixed Version
class DraggablePanelManager {
    constructor() {
        this.draggedElement = null;
        this.offset = { x: 0, y: 0 };
        this.isDragging = false;
        this.panels = [];
        this.initialized = false;

        // Add required CSS
        this.addRequiredCSS();

        // Initialize panels
        this.initializeDraggablePanels();
        this.setupEventListeners();

        this.initialized = true;
        console.log('🎛️ Draggable panel manager initialized');
    }

    addRequiredCSS() {
        const additionalCSS = `
        .draggable-panel {
            cursor: move;
            user-select: none;
            transition: box-shadow 0.2s ease;
        }

        .draggable-panel:hover {
            box-shadow: 0 8px 32px rgba(255, 149, 0, 0.3);
        }

        .draggable-panel.dragging {
            z-index: 9999;
            transform: rotate(2deg);
            box-shadow: 0 12px 40px rgba(255, 149, 0, 0.5);
        }

        .draggable-panel .drag-handle {
            cursor: move;
            padding: 5px;
            display: flex;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            margin-bottom: 10px;
        }

        .draggable-panel .drag-handle::before {
            content: '⋮⋮';
            color: #ff9500;
            margin-right: 8px;
            font-weight: bold;
            letter-spacing: 2px;
        }

        .panel-context-menu {
            position: fixed;
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid #ff9500;
            border-radius: 8px;
            padding: 8px 0;
            z-index: 10000;
            min-width: 150px;
            font-size: 0.85rem;
        }

        .panel-context-menu div {
            padding: 8px 16px;
            cursor: pointer;
            color: white;
            transition: background 0.2s ease;
        }

        .panel-context-menu div:hover {
            background: rgba(255, 149, 0, 0.2);
        }
        `;

        // Check if styles already exist
        if (!document.getElementById('draggable-panel-styles')) {
            const style = document.createElement('style');
            style.id = 'draggable-panel-styles';
            style.textContent = additionalCSS;
            document.head.appendChild(style);
        }
    }

    initializeDraggablePanels() {
        // Define all draggable panels with their configurations
        const panelConfigs = [
            {
                id: 'controls',
                selector: '.controls',
                title: 'Control Panel',
                icon: '🎛️',
                handleSelector: 'h4:first-child'
            },
            {
                id: 'metricsPanel',
                selector: '.metrics-panel',
                title: 'System Metrics',
                icon: '📊',
                handleSelector: 'h3'
            },
            {
                id: 'architectureDetails',
                selector: '.architecture-details',
                title: 'Architecture Details',
                icon: '🏗️',
                handleSelector: 'h3'
            },
            {
                id: 'legend',
                selector: '.legend',
                title: 'Components Legend',
                icon: '🗺️',
                handleSelector: 'h3'
            },
            {
                id: 'liveConsole',
                selector: '.live-console',
                title: 'Live Console',
                icon: '🖥️',
                handleSelector: '.console-header span'
            },
            {
                id: 'costTracker',
                selector: '.cost-tracker',
                title: 'Cost Tracker',
                icon: '💰',
                handleSelector: '.cost-header'
            },
            {
                id: 'trainingProgress',
                selector: '.training-progress',
                title: 'Training Progress',
                icon: '📈',
                handleSelector: 'div:first-child'
            }
        ];

        panelConfigs.forEach(config => {
            const panel = document.querySelector(config.selector);
            if (panel) {
                this.makePanelDraggable(panel, config);
                this.panels.push({ element: panel, config });
                console.log(`✅ Made draggable: ${config.title}`);
            } else {
                console.warn(`⚠️ Panel not found: ${config.selector}`);
            }
        });

        console.log(`📊 Initialized ${this.panels.length} draggable panels`);
    }

    makePanelDraggable(panel, config) {
        // Add draggable class
        panel.classList.add('draggable-panel');

        // Store original position for reset functionality
        const computedStyle = window.getComputedStyle(panel);
        panel.dataset.originalTop = computedStyle.top;
        panel.dataset.originalLeft = computedStyle.left;
        panel.dataset.originalRight = computedStyle.right;
        panel.dataset.originalBottom = computedStyle.bottom;
        panel.dataset.originalPosition = computedStyle.position;

        // Create or enhance the drag handle
        let dragHandle = panel.querySelector(config.handleSelector);
        if (dragHandle) {
            // Add drag handle styling
            dragHandle.classList.add('drag-handle');

            // Add icon if not already present
            if (!dragHandle.textContent.includes(config.icon)) {
                const originalText = dragHandle.textContent;
                dragHandle.innerHTML = `${config.icon} ${originalText}`;
            }
        } else {
            // Create a new drag handle if none exists
            dragHandle = document.createElement('div');
            dragHandle.className = 'drag-handle';
            dragHandle.innerHTML = `${config.icon} ${config.title}`;
            panel.insertBefore(dragHandle, panel.firstChild);
        }

        // Add event listeners to the drag handle
        dragHandle.addEventListener('mousedown', (e) => this.startDrag(e, panel));
        dragHandle.addEventListener('touchstart', (e) => this.startDrag(e, panel), { passive: false });

        // Add double-click to minimize/restore
        dragHandle.addEventListener('dblclick', (e) => this.toggleMinimize(panel));

        // Add right-click context menu
        dragHandle.addEventListener('contextmenu', (e) => this.showContextMenu(e, panel, config));

        // Prevent text selection on the drag handle
        dragHandle.style.userSelect = 'none';
        dragHandle.style.webkitUserSelect = 'none';
    }

    startDrag(e, panel) {
        e.preventDefault();
        e.stopPropagation();

        this.isDragging = true;
        this.draggedElement = panel;

        // Handle both mouse and touch events
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        const rect = panel.getBoundingClientRect();
        this.offset.x = clientX - rect.left;
        this.offset.y = clientY - rect.top;

        // Add dragging visual feedback
        panel.classList.add('dragging');

        // Change panel to absolute positioning
        panel.style.position = 'absolute';
        panel.style.left = rect.left + 'px';
        panel.style.top = rect.top + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.zIndex = '9999';

        // Create drag indicator
        this.createDragIndicator(panel);

        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';

        console.log(`🎯 Started dragging: ${panel.querySelector('.drag-handle').textContent}`);
    }

    setupEventListeners() {
        // Mouse events
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', (e) => this.endDrag(e));

        // Touch events
        document.addEventListener('touchmove', (e) => this.onDrag(e), { passive: false });
        document.addEventListener('touchend', (e) => this.endDrag(e));

        // Prevent default drag behavior on images and other elements
        document.addEventListener('dragstart', (e) => e.preventDefault());
    }

    onDrag(e) {
        if (!this.isDragging || !this.draggedElement) return;

        e.preventDefault();

        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        const newX = clientX - this.offset.x;
        const newY = clientY - this.offset.y;

        // Get viewport boundaries
        const maxX = window.innerWidth - this.draggedElement.offsetWidth;
        const maxY = window.innerHeight - this.draggedElement.offsetHeight;

        // Constrain to viewport
        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));

        this.draggedElement.style.left = constrainedX + 'px';
        this.draggedElement.style.top = constrainedY + 'px';

        // Update drag indicator
        this.updateDragIndicator(constrainedX, constrainedY);
    }

    endDrag(e) {
        if (!this.isDragging) return;

        this.isDragging = false;

        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging');

            // Snap to grid (optional)
            this.snapToGrid(this.draggedElement);

            console.log(`✅ Finished dragging: ${this.draggedElement.querySelector('.drag-handle').textContent}`);
        }

        this.draggedElement = null;
        this.removeDragIndicator();

        // Restore text selection
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
    }

    snapToGrid(element) {
        const gridSize = 20;
        const rect = element.getBoundingClientRect();

        const snappedX = Math.round(rect.left / gridSize) * gridSize;
        const snappedY = Math.round(rect.top / gridSize) * gridSize;

        element.style.left = snappedX + 'px';
        element.style.top = snappedY + 'px';
    }

    toggleMinimize(panel) {
        const content = Array.from(panel.children);
        const isMinimized = panel.dataset.minimized === 'true';

        if (isMinimized) {
            // Restore
            for (let i = 1; i < content.length; i++) {
                content[i].style.display = content[i].dataset.originalDisplay || '';
            }
            panel.dataset.minimized = 'false';
            panel.style.height = panel.dataset.originalHeight || 'auto';
        } else {
            // Minimize - store original display values and hide content
            panel.dataset.originalHeight = panel.style.height || 'auto';
            for (let i = 1; i < content.length; i++) {
                content[i].dataset.originalDisplay = content[i].style.display || '';
                content[i].style.display = 'none';
            }
            panel.dataset.minimized = 'true';
            panel.style.height = 'auto';
        }
    }

    showContextMenu(e, panel, config) {
        e.preventDefault();

        // Remove existing context menu
        const existingMenu = document.querySelector('.panel-context-menu');
        if (existingMenu) existingMenu.remove();

        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'panel-context-menu';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';

        const menuItems = [
            { text: '📌 Reset Position', action: () => this.resetPosition(panel) },
            { text: panel.dataset.minimized === 'true' ? '🔼 Restore' : '🔽 Minimize', action: () => this.toggleMinimize(panel) },
            { text: '👁️ Toggle Visibility', action: () => this.toggleVisibility(panel) },
            { text: '📐 Snap to Grid', action: () => this.snapToGrid(panel) }
        ];

        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.textContent = item.text;
            menuItem.addEventListener('click', () => {
                item.action();
                menu.remove();
            });
            menu.appendChild(menuItem);
        });

        document.body.appendChild(menu);

        // Remove menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', () => {
                if (menu.parentNode) menu.remove();
            }, { once: true });
        }, 100);
    }

    resetPosition(panel) {
        panel.style.position = panel.dataset.originalPosition || '';
        panel.style.left = panel.dataset.originalLeft || '';
        panel.style.top = panel.dataset.originalTop || '';
        panel.style.right = panel.dataset.originalRight || '';
        panel.style.bottom = panel.dataset.originalBottom || '';
        panel.style.zIndex = '';

        console.log(`🔄 Reset position for: ${panel.querySelector('.drag-handle').textContent}`);
    }

    toggleVisibility(panel) {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? '' : 'none';

        console.log(`👁️ ${isHidden ? 'Showed' : 'Hid'}: ${panel.querySelector('.drag-handle').textContent}`);
    }

    createDragIndicator(panel) {
        const indicator = document.createElement('div');
        indicator.id = 'panel-drag-indicator';
        indicator.style.cssText = `
            position: fixed;
            background: rgba(255, 149, 0, 0.8);
            color: white;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 0.8rem;
            z-index: 10001;
            pointer-events: none;
            border: 1px solid rgba(255, 149, 0, 1);
            box-shadow: 0 4px 12px rgba(255, 149, 0, 0.4);
        `;
        const handleText = panel.querySelector('.drag-handle').textContent;
        const cleanText = handleText.replace(/[⋮🎛️📊🏗️🗺️🖥️💰📈]/g, '').trim();
        indicator.textContent = `Moving: ${cleanText}`;
        document.body.appendChild(indicator);
    }

    updateDragIndicator(x, y) {
        const indicator = document.getElementById('panel-drag-indicator');
        if (indicator) {
            indicator.style.left = (x + 10) + 'px';
            indicator.style.top = (y - 10) + 'px';
        }
    }

    removeDragIndicator() {
        const indicator = document.getElementById('panel-drag-indicator');
        if (indicator) indicator.remove();
    }

    // Utility methods
    resetAllPanels() {
        this.panels.forEach(({ element }) => {
            this.resetPosition(element);
            element.style.display = '';
            if (element.dataset.minimized === 'true') {
                this.toggleMinimize(element);
            }
        });
        console.log('🔄 Reset all panels to original positions');
    }

    minimizeAllPanels() {
        this.panels.forEach(({ element }) => {
            if (element.dataset.minimized !== 'true') {
                this.toggleMinimize(element);
            }
        });
        console.log('🔽 Minimized all panels');
    }

    showAllPanels() {
        this.panels.forEach(({ element }) => {
            element.style.display = '';
            if (element.dataset.minimized === 'true') {
                this.toggleMinimize(element);
            }
        });
        console.log('👁️ Showed all panels');
    }
}
