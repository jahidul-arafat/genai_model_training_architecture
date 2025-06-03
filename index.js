class AWSGenAIArchitecture {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvasContainer = document.getElementById('canvasContainer');
        this.tooltip = document.getElementById('tooltip');
        this.draggingIndicator = document.getElementById('draggingIndicator');

        this.services = [];
        this.communications = [];
        this.animationSpeed = 1;
        this.isPaused = false;
        this.isTraining = false;
        this.trainingProgress = 0;

        // Mouse interaction state
        this.isDragging = false;
        this.draggedService = null;
        this.mousePos = {x: 0, y: 0};
        this.lastMousePos = {x: 0, y: 0};

        // AWS-specific metrics
        this.awsMetrics = {
            trainingInstances: 4,
            gpuUtilization: 78,
            modelParams: '70B',
            trainingLoss: 2.34,
            throughput: '1.2k tokens/sec',
            dataProcessed: '2.3TB',
            networkIO: '450 MB/s',
            reliabilityScore: 99.2,
            costPerHour: 892
        };

        this.setupCanvas();
        this.setupEventListeners();
        this.initializeAWSServices();
        this.createFloatingParticles();
        this.animate();
        this.startMetricsUpdater();
    }

    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * 2;
        this.canvas.height = rect.height * 2;
        this.ctx.scale(2, 2);

        window.addEventListener('resize', () => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * 2;
            this.canvas.height = rect.height * 2;
            this.ctx.scale(2, 2);
        });
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    getServiceAtPosition(x, y) {
        for (let service of this.services) {
            const dx = x - service.x;
            const dy = y - service.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= service.radius) {
                return service;
            }
        }
        return null;
    }

    handleMouseDown(e) {
        const mousePos = this.getMousePos(e);
        const service = this.getServiceAtPosition(mousePos.x, mousePos.y);

        if (service) {
            this.isDragging = true;
            this.draggedService = service;
            this.lastMousePos = mousePos;
            this.canvasContainer.classList.add('dragging');
            this.hideTooltip();

            this.draggingIndicator.textContent = `Moving: ${service.name}`;
            this.draggingIndicator.style.display = 'block';
            this.draggingIndicator.style.left = mousePos.x + 10 + 'px';
            this.draggingIndicator.style.top = mousePos.y - 10 + 'px';
        }
    }

    handleMouseMove(e) {
        const mousePos = this.getMousePos(e);
        this.mousePos = mousePos;

        if (this.isDragging && this.draggedService) {
            const dx = mousePos.x - this.lastMousePos.x;
            const dy = mousePos.y - this.lastMousePos.y;

            this.draggedService.x += dx;
            this.draggedService.y += dy;

            const margin = this.draggedService.radius + 15;
            this.draggedService.x = Math.max(margin, Math.min(this.canvas.width / 2 - margin, this.draggedService.x));
            this.draggedService.y = Math.max(margin, Math.min(this.canvas.height / 2 - margin, this.draggedService.y));

            this.lastMousePos = mousePos;

            this.draggingIndicator.style.left = mousePos.x + 10 + 'px';
            this.draggingIndicator.style.top = mousePos.y - 10 + 'px';
        } else {
            const service = this.getServiceAtPosition(mousePos.x, mousePos.y);
            if (service) {
                this.showTooltip(service, mousePos);
            } else {
                this.hideTooltip();
            }
        }
    }

    handleMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.draggedService = null;
            this.canvasContainer.classList.remove('dragging');
            this.draggingIndicator.style.display = 'none';
        }
    }

    handleMouseLeave(e) {
        this.hideTooltip();
        if (this.isDragging) {
            this.handleMouseUp(e);
        }
    }

    showTooltip(service, mousePos) {
        const tooltip = this.tooltip;
        const connections = this.communications.filter(c =>
            c.fromService === service || c.toService === service
        );

        const uptimeHours = ((Date.now() - service.launchTime) / (1000 * 60 * 60)).toFixed(1);

        tooltip.innerHTML = `
                <h4>${service.name}</h4>
                <div class="tooltip-section">
                    <div class="tooltip-label">AWS Service:</div>
                    <span class="aws-service-badge service-${service.awsService.toLowerCase()}">${service.awsService}</span>
                </div>
                <div class="tooltip-section">
                    <div class="tooltip-label">Instance Type:</div>
                    ${service.instanceType} (${service.vCPUs} vCPUs, ${service.memory} GB RAM)
                </div>
                <div class="tooltip-section">
                    <div class="tooltip-label">Performance:</div>
                    Utilization: ${service.utilization}%<br>
                    Throughput: ${service.throughput}<br>
                    Latency: ${service.latency}ms
                </div>
                <div class="tooltip-section">
                    <div class="tooltip-label">Reliability:</div>
                    Health: ${service.healthStatus}<br>
                    Uptime: ${uptimeHours}h<br>
                    SLA: ${service.slaTarget}%
                </div>
                <div class="tooltip-section">
                    <div class="tooltip-label">Cost:</div>
                    $${service.costPerHour}/hour<br>
                    Spot: ${service.isSpot ? 'Yes' : 'No'}
                </div>
                <div class="tooltip-section">
                    <div class="tooltip-label">Network:</div>
                    Active Connections: ${connections.length}<br>
                    AZ: ${service.availabilityZone}
                </div>
            `;

        tooltip.style.display = 'block';
        tooltip.style.left = Math.min(mousePos.x + 15, window.innerWidth - 340) + 'px';
        tooltip.style.top = Math.max(10, mousePos.y - 10) + 'px';
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
    }

    initializeAWSServices() {
        const centerX = this.canvas.width / 4;
        const centerY = this.canvas.height / 4;

        // Central Data Lake (S3)
        this.services.push({
            id: 'S3_DATALAKE',
            name: 'S3 Data Lake',
            x: centerX,
            y: centerY - 200,
            radius: 65,
            baseRadius: 65,
            color: '#ff6b35',
            gradient: ['#ff6b35', '#ff4757'],
            activity: 0,
            pulse: 0,
            awsService: 'S3',
            instanceType: 'Storage',
            vCPUs: 'N/A',
            memory: 'Unlimited',
            utilization: 45,
            throughput: '2.1 GB/s',
            latency: 12,
            healthStatus: 'Healthy',
            launchTime: Date.now() - 86400000,
            slaTarget: 99.9,
            costPerHour: 150,
            isSpot: false,
            availabilityZone: 'us-east-1a',
            organelles: this.createOrganelles(8),
            membrane: {thickness: 4, opacity: 0.9},
            reliabilityScore: 99.8
        });

        // SageMaker Training Cluster
        this.services.push({
            id: 'SAGEMAKER_TRAINING',
            name: 'SageMaker Training',
            x: centerX - 300,
            y: centerY,
            radius: 75,
            baseRadius: 75,
            color: '#00d4aa',
            gradient: ['#00d4aa', '#0080ff'],
            activity: 0,
            pulse: 0,
            awsService: 'SageMaker',
            instanceType: 'ml.p4d.24xlarge',
            vCPUs: 96,
            memory: 1152,
            utilization: 85,
            throughput: '1.2k tokens/sec',
            latency: 45,
            healthStatus: 'Healthy',
            launchTime: Date.now() - 43200000,
            slaTarget: 99.5,
            costPerHour: 458,
            isSpot: false,
            availabilityZone: 'us-east-1a',
            organelles: this.createOrganelles(12),
            membrane: {thickness: 5, opacity: 0.95},
            reliabilityScore: 99.1
        });

        // EC2 Distributed Training Nodes
        this.services.push({
            id: 'EC2_TRAINING_NODES',
            name: 'EC2 Training Cluster',
            x: centerX + 300,
            y: centerY,
            radius: 70,
            baseRadius: 70,
            color: '#ff9500',
            gradient: ['#ff9500', '#ff6b35'],
            activity: 0,
            pulse: 0,
            awsService: 'EC2',
            instanceType: 'p4d.24xlarge',
            vCPUs: 96,
            memory: 1152,
            utilization: 92,
            throughput: '980 tokens/sec',
            latency: 38,
            healthStatus: 'Healthy',
            launchTime: Date.now() - 21600000,
            slaTarget: 99.0,
            costPerHour: 434,
            isSpot: true,
            availabilityZone: 'us-east-1b',
            organelles: this.createOrganelles(10),
            membrane: {thickness: 4, opacity: 0.9},
            reliabilityScore: 98.7
        });

        // Bedrock Foundation Models
        this.services.push({
            id: 'BEDROCK_MODELS',
            name: 'Bedrock Foundation',
            x: centerX,
            y: centerY + 250,
            radius: 60,
            baseRadius: 60,
            color: '#9966cc',
            gradient: ['#9966cc', '#6b46c1'],
            activity: 0,
            pulse: 0,
            awsService: 'Bedrock',
            instanceType: 'Managed Service',
            vCPUs: 'Elastic',
            memory: 'Elastic',
            utilization: 35,
            throughput: '500 tokens/sec',
            latency: 120,
            healthStatus: 'Healthy',
            launchTime: Date.now() - 7200000,
            slaTarget: 99.9,
            costPerHour: 125,
            isSpot: false,
            availabilityZone: 'us-east-1c',
            organelles: this.createOrganelles(6),
            membrane: {thickness: 3, opacity: 0.85},
            reliabilityScore: 99.5
        });

        // Lambda Data Processing
        this.services.push({
            id: 'LAMBDA_PREPROCESSING',
            name: 'Lambda Data Pipeline',
            x: centerX - 150,
            y: centerY - 300,
            radius: 45,
            baseRadius: 45,
            color: '#ffa502',
            gradient: ['#ffa502', '#ff9500'],
            activity: 0,
            pulse: 0,
            awsService: 'Lambda',
            instanceType: '15GB Memory',
            vCPUs: '6 vCPU equiv',
            memory: 15,
            utilization: 65,
            throughput: '2.5k requests/sec',
            latency: 25,
            healthStatus: 'Healthy',
            launchTime: Date.now() - 3600000,
            slaTarget: 99.95,
            costPerHour: 45,
            isSpot: false,
            availabilityZone: 'Multi-AZ',
            organelles: this.createOrganelles(4),
            membrane: {thickness: 2, opacity: 0.8},
            reliabilityScore: 99.6
        });

        // ECS Model Serving
        this.services.push({
            id: 'ECS_SERVING',
            name: 'ECS Model Serving',
            x: centerX + 150,
            y: centerY + 150,
            radius: 50,
            baseRadius: 50,
            color: '#0080ff',
            gradient: ['#0080ff', '#00d4aa'],
            activity: 0,
            pulse: 0,
            awsService: 'ECS',
            instanceType: 'c5.4xlarge',
            vCPUs: 16,
            memory: 32,
            utilization: 58,
            throughput: '850 requests/sec',
            latency: 15,
            healthStatus: 'Healthy',
            launchTime: Date.now() - 14400000,
            slaTarget: 99.5,
            costPerHour: 95,
            isSpot: false,
            availabilityZone: 'us-east-1a',
            organelles: this.createOrganelles(5),
            membrane: {thickness: 3, opacity: 0.85},
            reliabilityScore: 99.3
        });

        // CloudWatch Monitoring
        this.services.push({
            id: 'CLOUDWATCH_MONITORING',
            name: 'CloudWatch Monitor',
            x: centerX - 200,
            y: centerY + 200,
            radius: 40,
            baseRadius: 40,
            color: '#ff6b6b',
            gradient: ['#ff6b6b', '#ff8e53'],
            activity: 0,
            pulse: 0,
            awsService: 'CloudWatch',
            instanceType: 'Managed Service',
            vCPUs: 'N/A',
            memory: 'N/A',
            utilization: 25,
            throughput: '10k metrics/sec',
            latency: 8,
            healthStatus: 'Healthy',
            launchTime: Date.now() - 172800000,
            slaTarget: 99.9,
            costPerHour: 25,
            isSpot: false,
            availabilityZone: 'Multi-AZ',
            organelles: this.createOrganelles(3),
            membrane: {thickness: 2, opacity: 0.8},
            reliabilityScore: 99.7
        });
    }

    createOrganelles(count) {
        const organelles = [];
        for (let i = 0; i < count; i++) {
            organelles.push({
                x: (Math.random() - 0.5) * 80,
                y: (Math.random() - 0.5) * 80,
                radius: 3 + Math.random() * 6,
                speed: 0.3 + Math.random() * 0.8,
                angle: Math.random() * Math.PI * 2,
                color: `hsl(${200 + Math.random() * 80}, 70%, 65%)`
            });
        }
        return organelles;
    }

    drawService(service) {
        const {x, y, radius, gradient, activity, pulse, organelles, membrane} = service;

        // Dragging highlight
        if (this.draggedService === service) {
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 4;
            this.ctx.setLineDash([8, 4]);
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius + 15, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Service membrane with AWS-style glow
        const glowRadius = radius + 20 + Math.sin(pulse) * 8;
        const membraneGradient = this.ctx.createRadialGradient(x, y, radius * 0.7, x, y, glowRadius);
        membraneGradient.addColorStop(0, `${gradient[0]}50`);
        membraneGradient.addColorStop(0.7, `${gradient[0]}25`);
        membraneGradient.addColorStop(1, 'transparent');

        this.ctx.fillStyle = membraneGradient;
        this.ctx.fillRect(x - glowRadius, y - glowRadius, glowRadius * 2, glowRadius * 2);

        // Main service body
        const serviceGradient = this.ctx.createRadialGradient(x - radius * 0.4, y - radius * 0.4, 0, x, y, radius);
        serviceGradient.addColorStop(0, gradient[0] + 'DD');
        serviceGradient.addColorStop(0.6, gradient[1] + 'BB');
        serviceGradient.addColorStop(1, gradient[1] + '77');

        this.ctx.fillStyle = serviceGradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Service border with AWS styling
        this.ctx.strokeStyle = gradient[0] + 'EE';
        this.ctx.lineWidth = membrane.thickness;
        this.ctx.stroke();

        // Reliability indicator ring
        const reliabilityColor = service.reliabilityScore > 99 ? '#00ff88' :
            service.reliabilityScore > 95 ? '#ffa502' : '#ff4757';
        this.ctx.strokeStyle = reliabilityColor + '99';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
        this.ctx.stroke();

        // Internal components (organelles representing microservices/processes)
        organelles.forEach(org => {
            org.angle += org.speed * 0.008 * this.animationSpeed;
            const orgX = x + Math.cos(org.angle) * (radius * 0.4) + org.x * 0.4;
            const orgY = y + Math.sin(org.angle) * (radius * 0.4) + org.y * 0.4;

            this.ctx.fillStyle = org.color + '99';
            this.ctx.beginPath();
            this.ctx.arc(orgX, orgY, org.radius, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = org.color + 'CC';
            this.ctx.beginPath();
            this.ctx.arc(orgX - 1, orgY - 1, org.radius * 0.7, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Central processing core
        const coreGradient = this.ctx.createRadialGradient(x, y, 0, x, y, 18);
        coreGradient.addColorStop(0, '#ffffff99');
        coreGradient.addColorStop(0.4, gradient[0] + '77');
        coreGradient.addColorStop(1, gradient[1] + '55');

        this.ctx.fillStyle = coreGradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 18, 0, Math.PI * 2);
        this.ctx.fill();

        // Activity indicators
        if (activity > 0) {
            const activityRadius = radius + 25 + activity * 20;
            this.ctx.strokeStyle = gradient[0] + Math.floor(activity * 255).toString(16).padStart(2, '0');
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.arc(x, y, activityRadius, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // AWS Service badge
        this.ctx.fillStyle = '#ff9500';
        this.ctx.font = 'bold 9px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(service.awsService, x, y - radius - 45);

        // Service name and instance type
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 11px Arial';
        this.ctx.fillText(service.name, x, y + radius + 18);

        this.ctx.fillStyle = '#a0a0a0';
        this.ctx.font = '8px Arial';
        this.ctx.fillText(service.instanceType, x, y + radius + 32);

        // Utilization bar
        const barWidth = 40;
        const barHeight = 4;
        const barX = x - barWidth / 2;
        const barY = y + radius + 40;

        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        const utilizationColor = service.utilization > 80 ? '#ff4757' :
            service.utilization > 60 ? '#ffa502' : '#00ff88';
        this.ctx.fillStyle = utilizationColor;
        this.ctx.fillRect(barX, barY, (barWidth * service.utilization) / 100, barHeight);

        // Status indicators
        const statusIcon = service.healthStatus === 'Healthy' ? '🟢' :
            service.healthStatus === 'Warning' ? '🟡' : '🔴';
        this.ctx.font = '10px Arial';
        this.ctx.fillText(statusIcon, x + radius - 8, y - radius + 12);

        // Spot instance indicator
        if (service.isSpot) {
            this.ctx.fillStyle = '#ffa502';
            this.ctx.font = 'bold 8px Arial';
            this.ctx.fillText('SPOT', x - radius + 8, y - radius + 12);
        }

        // Cost indicator
        this.ctx.fillStyle = '#00ff88';
        this.ctx.font = '7px Arial';
        this.ctx.fillText(`${service.costPerHour}/h`, x, y + radius + 55);

        // Reliability score indicator
        const reliabilityIndicator = document.createElement('div');
        reliabilityIndicator.className = `reliability-indicator reliability-${
            service.reliabilityScore > 99 ? 'high' :
                service.reliabilityScore > 95 ? 'medium' : 'low'
        }`;
    }

    drawCommunication(comm) {
        const {fromService, toService, progress, type, particles} = comm;

        if (!fromService || !toService) return;

        const dx = toService.x - fromService.x;
        const dy = toService.y - fromService.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // AWS communication protocol colors
        const protocolColors = {
            'data-transfer': '#00ff88',
            'model-sync': '#0080ff',
            'control-signal': '#ff9500',
            'checkpoint': '#9966cc',
            'monitoring': '#ff6b6b',
            'inference': '#00d4aa',
            'preprocessing': '#ffa502'
        };

        const lineColor = protocolColors[type] || '#ffffff';
        const lineWidth = type === 'model-sync' ? 4 : type === 'data-transfer' ? 3 : 2;

        // Draw connection line with AWS styling
        this.ctx.strokeStyle = `${lineColor}${Math.floor((0.4 + Math.sin(progress * Math.PI) * 0.4) * 255).toString(16).padStart(2, '0')}`;
        this.ctx.lineWidth = lineWidth;

        if (type === 'monitoring') {
            this.ctx.setLineDash([5, 10]);
        } else if (type === 'checkpoint') {
            this.ctx.setLineDash([15, 5]);
        } else {
            this.ctx.setLineDash([]);
        }

        this.ctx.beginPath();
        this.ctx.moveTo(fromService.x, fromService.y);
        this.ctx.lineTo(toService.x, toService.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Enhanced directional arrow
        const arrowSize = 10;
        const arrowX = fromService.x + dx * 0.75;
        const arrowY = fromService.y + dy * 0.75;
        const angle = Math.atan2(dy, dx);

        this.ctx.fillStyle = lineColor;
        this.ctx.beginPath();
        this.ctx.moveTo(arrowX, arrowY);
        this.ctx.lineTo(
            arrowX - arrowSize * Math.cos(angle - Math.PI / 5),
            arrowY - arrowSize * Math.sin(angle - Math.PI / 5)
        );
        this.ctx.lineTo(
            arrowX - arrowSize * Math.cos(angle + Math.PI / 5),
            arrowY - arrowSize * Math.sin(angle + Math.PI / 5)
        );
        this.ctx.closePath();
        this.ctx.fill();

        // Enhanced signal particles
        particles.forEach((particle, index) => {
            const particleProgress = (progress + index * 0.12) % 1;
            const particleX = fromService.x + dx * particleProgress;
            const particleY = fromService.y + dy * particleProgress;

            // Particle trail with AWS styling
            for (let i = 0; i < 5; i++) {
                const trailProgress = Math.max(0, particleProgress - i * 0.06);
                const trailX = fromService.x + dx * trailProgress;
                const trailY = fromService.y + dy * trailProgress;
                const alpha = (5 - i) / 5 * 0.9;

                this.ctx.fillStyle = `${lineColor}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                this.ctx.beginPath();
                this.ctx.arc(trailX, trailY, 5 - i * 0.8, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Main particle with enhanced glow
            const particleGradient = this.ctx.createRadialGradient(particleX, particleY, 0, particleX, particleY, 12);
            particleGradient.addColorStop(0, lineColor);
            particleGradient.addColorStop(0.4, lineColor + 'BB');
            particleGradient.addColorStop(1, 'transparent');

            this.ctx.fillStyle = particleGradient;
            this.ctx.beginPath();
            this.ctx.arc(particleX, particleY, 12, 0, Math.PI * 2);
            this.ctx.fill();

            // Protocol label
            if (particleProgress > 0.15 && particleProgress < 0.85) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 7px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(type.toUpperCase().replace('-', ' '), particleX, particleY - 18);
            }
        });

        // Data throughput indicator
        const throughput = this.calculateThroughput(type);
        if (progress > 0.3 && progress < 0.7) {
            const midX = fromService.x + dx * 0.5;
            const midY = fromService.y + dy * 0.5;

            this.ctx.fillStyle = '#ffffff99';
            this.ctx.font = '7px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(throughput, midX, midY - 25);
        }
    }

    calculateThroughput(type) {
        const throughputs = {
            'data-transfer': `${(2.1 + Math.random() * 0.5).toFixed(1)} GB/s`,
            'model-sync': `${(850 + Math.random() * 200).toFixed(0)} MB/s`,
            'control-signal': `${(15 + Math.random() * 10).toFixed(0)} KB/s`,
            'checkpoint': `${(1.2 + Math.random() * 0.3).toFixed(1)} GB/s`,
            'monitoring': `${(500 + Math.random() * 200).toFixed(0)} metrics/s`,
            'inference': `${(450 + Math.random() * 100).toFixed(0)} req/s`,
            'preprocessing': `${(2.8 + Math.random() * 0.7).toFixed(1)} MB/s`
        };
        return throughputs[type] || '1.0 MB/s';
    }

    addCommunication(type, fromId = null, toId = null) {
        if (this.services.length < 2) return;

        let fromService, toService;

        if (fromId && toId) {
            fromService = this.services.find(s => s.id === fromId);
            toService = this.services.find(s => s.id === toId);
        } else {
            // Smart routing based on AWS service types
            const communicationPatterns = {
                'data-transfer': {
                    from: ['S3_DATALAKE'],
                    to: ['SAGEMAKER_TRAINING', 'EC2_TRAINING_NODES', 'LAMBDA_PREPROCESSING']
                },
                'model-sync': {
                    from: ['SAGEMAKER_TRAINING', 'EC2_TRAINING_NODES'],
                    to: ['ECS_SERVING', 'BEDROCK_MODELS']
                },
                'control-signal': {from: ['CLOUDWATCH_MONITORING'], to: ['SAGEMAKER_TRAINING', 'EC2_TRAINING_NODES']},
                'checkpoint': {from: ['SAGEMAKER_TRAINING', 'EC2_TRAINING_NODES'], to: ['S3_DATALAKE']},
                'monitoring': {
                    from: ['SAGEMAKER_TRAINING', 'EC2_TRAINING_NODES', 'ECS_SERVING'],
                    to: ['CLOUDWATCH_MONITORING']
                },
                'inference': {from: ['ECS_SERVING', 'BEDROCK_MODELS'], to: ['LAMBDA_PREPROCESSING']},
                'preprocessing': {from: ['LAMBDA_PREPROCESSING'], to: ['SAGEMAKER_TRAINING', 'EC2_TRAINING_NODES']}
            };

            const pattern = communicationPatterns[type];
            if (pattern) {
                const fromIds = pattern.from.filter(id => this.services.find(s => s.id === id));
                const toIds = pattern.to.filter(id => this.services.find(s => s.id === id));

                if (fromIds.length > 0 && toIds.length > 0) {
                    fromService = this.services.find(s => s.id === fromIds[Math.floor(Math.random() * fromIds.length)]);
                    toService = this.services.find(s => s.id === toIds[Math.floor(Math.random() * toIds.length)]);
                }
            }
        }

        if (!fromService || !toService || fromService === toService) {
            // Fallback to random selection
            fromService = this.services[Math.floor(Math.random() * this.services.length)];
            toService = this.services[Math.floor(Math.random() * this.services.length)];
            if (fromService === toService) return;
        }

        const communication = {
            id: Date.now() + Math.random(),
            fromService,
            toService,
            type,
            progress: 0,
            speed: this.getCommunicationSpeed(type),
            particles: Array(this.getParticleCount(type)).fill().map((_, i) => ({id: i})),
            startTime: Date.now(),
            dataSize: this.getDataSize(type)
        };

        this.communications.push(communication);

        // Update service metrics
        fromService.activity = Math.min(1, fromService.activity + 0.5);
        toService.activity = Math.min(1, toService.activity + 0.4);
        fromService.utilization = Math.min(100, fromService.utilization + Math.random() * 5);

        // Auto-remove after completion
        setTimeout(() => {
            this.communications = this.communications.filter(c => c.id !== communication.id);
        }, 8000);
    }

    getCommunicationSpeed(type) {
        const speeds = {
            'data-transfer': 0.008,
            'model-sync': 0.006,
            'control-signal': 0.02,
            'checkpoint': 0.004,
            'monitoring': 0.015,
            'inference': 0.018,
            'preprocessing': 0.012
        };
        return speeds[type] || 0.01;
    }

    getParticleCount(type) {
        const counts = {
            'data-transfer': 6,
            'model-sync': 8,
            'control-signal': 2,
            'checkpoint': 4,
            'monitoring': 3,
            'inference': 4,
            'preprocessing': 5
        };
        return counts[type] || 3;
    }

    getDataSize(type) {
        const sizes = {
            'data-transfer': '2.3 GB',
            'model-sync': '850 MB',
            'control-signal': '15 KB',
            'checkpoint': '1.2 GB',
            'monitoring': '500 KB',
            'inference': '125 MB',
            'preprocessing': '450 MB'
        };
        return sizes[type] || '100 MB';
    }

    createFloatingParticles() {
        const particlesContainer = document.getElementById('particles');

        setInterval(() => {
            if (this.isPaused) return;

            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDuration = (10 + Math.random() * 6) + 's';
            particle.style.animationDelay = Math.random() * 3 + 's';

            particlesContainer.appendChild(particle);

            setTimeout(() => {
                particle.remove();
            }, 16000);
        }, 4000);
    }

    updateMetrics() {
        // Simulate realistic AWS metrics
        this.awsMetrics.gpuUtilization = Math.max(40, Math.min(95, this.awsMetrics.gpuUtilization + (Math.random() - 0.5) * 10));
        this.awsMetrics.trainingLoss = Math.max(1.2, this.awsMetrics.trainingLoss - Math.random() * 0.01);

        const activeServices = this.services.filter(s => s.activity > 0.1).length;
        this.awsMetrics.trainingInstances = activeServices;

        document.getElementById('trainingInstances').textContent = this.awsMetrics.trainingInstances;
        document.getElementById('gpuUtilization').textContent = Math.round(this.awsMetrics.gpuUtilization) + '%';
        document.getElementById('modelParams').textContent = this.awsMetrics.modelParams;
        document.getElementById('trainingLoss').textContent = this.awsMetrics.trainingLoss.toFixed(3);
        document.getElementById('throughput').textContent = this.awsMetrics.throughput;
        document.getElementById('dataProcessed').textContent = this.awsMetrics.dataProcessed;
        document.getElementById('networkIO').textContent = this.awsMetrics.networkIO;

        const avgReliability = this.services.reduce((sum, s) => sum + s.reliabilityScore, 0) / this.services.length;
        document.getElementById('reliabilityScore').textContent = avgReliability.toFixed(1) + '%';

        const totalCost = this.services.reduce((sum, s) => sum + s.costPerHour, 0);
        document.getElementById('costPerHour').textContent = '' + totalCost;
    }

    startMetricsUpdater() {
        setInterval(() => {
            this.updateMetrics();
        }, 2000);
    }

    animate() {
        if (!this.isPaused) {
            // Clear canvas with AWS-themed background
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width / 2, this.canvas.height / 2);
            gradient.addColorStop(0, '#0a0a0a');
            gradient.addColorStop(0.3, '#1a1a2e');
            gradient.addColorStop(0.7, '#16213e');
            gradient.addColorStop(1, '#2c1810');

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width / 2, this.canvas.height / 2);

            // Update and draw services
            this.services.forEach(service => {
                service.pulse += 0.04 * this.animationSpeed;
                service.activity = Math.max(0, service.activity - 0.006);
                service.radius = service.baseRadius + Math.sin(service.pulse) * 4;

                this.drawService(service);
            });

            // Update and draw communications
            this.communications.forEach(comm => {
                comm.progress += comm.speed * this.animationSpeed;
                if (comm.progress >= 1) {
                    comm.progress = 0;
                    comm.toService.activity = Math.min(1, comm.toService.activity + 0.4);
                }
                this.drawCommunication(comm);
            });

            // Update training progress if training is active
            if (this.isTraining) {
                this.trainingProgress += 0.1 * this.animationSpeed;
                if (this.trainingProgress >= 100) {
                    this.trainingProgress = 100;
                    this.isTraining = false;
                    document.getElementById('trainingProgress').style.display = 'none';
                }

                const progressElement = document.getElementById('progressFill');
                const progressText = document.getElementById('progressText');
                if (progressElement && progressText) {
                    progressElement.style.width = this.trainingProgress + '%';
                    progressText.textContent = Math.round(this.trainingProgress) + '%';
                }
            }
        }

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize AWS GenAI Architecture
let awsArchitecture;

window.addEventListener('load', () => {
    awsArchitecture = new AWSGenAIArchitecture();

    // Auto-generate realistic AWS communications
    setInterval(() => {
        if (!awsArchitecture.isPaused && Math.random() < 0.6) {
            const communicationTypes = [
                {type: 'data-transfer', probability: 0.25},
                {type: 'model-sync', probability: 0.20},
                {type: 'monitoring', probability: 0.20},
                {type: 'control-signal', probability: 0.15},
                {type: 'inference', probability: 0.10},
                {type: 'preprocessing', probability: 0.10}
            ];

            const rand = Math.random();
            let cumulative = 0;

            for (const commType of communicationTypes) {
                cumulative += commType.probability;
                if (rand <= cumulative) {
                    awsArchitecture.addCommunication(commType.type);
                    break;
                }
            }
        }
    }, 1800);

    // Periodic checkpoint saves during training
    setInterval(() => {
        if (awsArchitecture.isTraining && Math.random() < 0.3) {
            awsArchitecture.addCommunication('checkpoint', 'SAGEMAKER_TRAINING', 'S3_DATALAKE');
            awsArchitecture.addCommunication('checkpoint', 'EC2_TRAINING_NODES', 'S3_DATALAKE');
        }
    }, 5000);
});

// Control Functions
function startTraining() {
    if (awsArchitecture) {
        awsArchitecture.isTraining = true;
        awsArchitecture.trainingProgress = 0;
        document.getElementById('trainingProgress').style.display = 'block';

        // Trigger initial training communications
        awsArchitecture.addCommunication('data-transfer', 'S3_DATALAKE', 'SAGEMAKER_TRAINING');
        awsArchitecture.addCommunication('data-transfer', 'S3_DATALAKE', 'EC2_TRAINING_NODES');
        awsArchitecture.addCommunication('preprocessing', 'LAMBDA_PREPROCESSING', 'SAGEMAKER_TRAINING');

        // Activate training services
        const trainingServices = ['SAGEMAKER_TRAINING', 'EC2_TRAINING_NODES'];
        trainingServices.forEach(serviceId => {
            const service = awsArchitecture.services.find(s => s.id === serviceId);
            if (service) {
                service.activity = 1;
                service.utilization = Math.min(95, service.utilization + 20);
            }
        });
    }
}

function pauseTraining() {
    if (awsArchitecture) {
        awsArchitecture.isTraining = false;
        // Trigger checkpoint save before pausing
        awsArchitecture.addCommunication('checkpoint', 'SAGEMAKER_TRAINING', 'S3_DATALAKE');
    }
}

function stopTraining() {
    if (awsArchitecture) {
        awsArchitecture.isTraining = false;
        awsArchitecture.trainingProgress = 0;
        document.getElementById('trainingProgress').style.display = 'none';

        // Final model save
        awsArchitecture.addCommunication('model-sync', 'SAGEMAKER_TRAINING', 'S3_DATALAKE');
        awsArchitecture.addCommunication('model-sync', 'EC2_TRAINING_NODES', 'BEDROCK_MODELS');
    }
}

function triggerCheckpoint() {
    if (awsArchitecture) {
        awsArchitecture.addCommunication('checkpoint', 'SAGEMAKER_TRAINING', 'S3_DATALAKE');
        awsArchitecture.addCommunication('checkpoint', 'EC2_TRAINING_NODES', 'S3_DATALAKE');

        // Show checkpoint notification
        setTimeout(() => {
            alert('✅ Model checkpoint saved successfully!\nLocation: s3://model-checkpoints/epoch-' + Math.floor(Math.random() * 100));
        }, 2000);
    }
}

function validateModel() {
    if (awsArchitecture) {
        awsArchitecture.addCommunication('inference', 'ECS_SERVING', 'BEDROCK_MODELS');
        awsArchitecture.addCommunication('data-transfer', 'S3_DATALAKE', 'ECS_SERVING');

        setTimeout(() => {
            const accuracy = (92.5 + Math.random() * 5).toFixed(2);
            const f1Score = (0.89 + Math.random() * 0.08).toFixed(3);
            alert(`🎯 Model Validation Results:\nAccuracy: ${accuracy}%\nF1 Score: ${f1Score}\nPerplexity: ${(15.2 + Math.random() * 5).toFixed(1)}`);
        }, 3000);
    }
}

function triggerDataIngestion() {
    if (awsArchitecture) {
        awsArchitecture.addCommunication('data-transfer', 'S3_DATALAKE', 'LAMBDA_PREPROCESSING');
        awsArchitecture.addCommunication('preprocessing', 'LAMBDA_PREPROCESSING', 'SAGEMAKER_TRAINING');

        // Update data processed metric
        const currentData = parseFloat(awsArchitecture.awsMetrics.dataProcessed);
        awsArchitecture.awsMetrics.dataProcessed = (currentData + 0.5 + Math.random() * 0.3).toFixed(1) + 'TB';
    }
}

function triggerPreprocessing() {
    if (awsArchitecture) {
        awsArchitecture.addCommunication('preprocessing', 'LAMBDA_PREPROCESSING', 'SAGEMAKER_TRAINING');
        awsArchitecture.addCommunication('preprocessing', 'LAMBDA_PREPROCESSING', 'EC2_TRAINING_NODES');

        const lambdaService = awsArchitecture.services.find(s => s.id === 'LAMBDA_PREPROCESSING');
        if (lambdaService) {
            lambdaService.activity = 1;
            lambdaService.utilization = Math.min(90, lambdaService.utilization + 15);
        }
    }
}

function triggerDataValidation() {
    if (awsArchitecture) {
        awsArchitecture.addCommunication('monitoring', 'S3_DATALAKE', 'CLOUDWATCH_MONITORING');
        awsArchitecture.addCommunication('control-signal', 'CLOUDWATCH_MONITORING', 'LAMBDA_PREPROCESSING');

        setTimeout(() => {
            const dataQuality = (96.8 + Math.random() * 2.5).toFixed(1);
            alert(`📊 Data Validation Complete:\nData Quality Score: ${dataQuality}%\nCorrupted Records: ${Math.floor(Math.random() * 50)}\nSchema Compliance: 99.7%`);
        }, 2500);
    }
}

function updateInstanceType() {
    if (awsArchitecture) {
        const instanceType = document.getElementById('instanceType').value;
        const ec2Service = awsArchitecture.services.find(s => s.id === 'EC2_TRAINING_NODES');
        const sagemakerService = awsArchitecture.services.find(s => s.id === 'SAGEMAKER_TRAINING');

        if (ec2Service) {
            ec2Service.instanceType = instanceType;
            // Update cost based on instance type
            const costs = {
                'p4d.24xlarge': 434,
                'p3dn.24xlarge': 318,
                'trn1.32xlarge': 245,
                'inf2.48xlarge': 156
            };
            ec2Service.costPerHour = costs[instanceType] || 400;
        }
    }
}

function scaleOut() {
    if (awsArchitecture) {
        // Add a new training instance
        const newInstance = {
            id: `EC2_SCALE_${Date.now()}`,
            name: 'EC2 Scale Instance',
            x: 200 + Math.random() * 400,
            y: 200 + Math.random() * 300,
            radius: 45,
            baseRadius: 45,
            color: '#ff9500',
            gradient: ['#ff9500', '#ff6b35'],
            activity: 0,
            pulse: 0,
            awsService: 'EC2',
            instanceType: document.getElementById('instanceType').value,
            vCPUs: 96,
            memory: 1152,
            utilization: 45,
            throughput: '750 tokens/sec',
            latency: 42,
            healthStatus: 'Healthy',
            launchTime: Date.now(),
            slaTarget: 99.0,
            costPerHour: 434,
            isSpot: true,
            availabilityZone: 'us-east-1c',
            organelles: awsArchitecture.createOrganelles(8),
            membrane: {thickness: 3, opacity: 0.85},
            reliabilityScore: 98.5
        };

        awsArchitecture.services.push(newInstance);
        awsArchitecture.addCommunication('control-signal', 'CLOUDWATCH_MONITORING', newInstance.id);
    }
}

function scaleIn() {
    if (awsArchitecture) {
        // Remove the last scaled instance
        const scaleInstance = awsArchitecture.services.find(s => s.id.startsWith('EC2_SCALE_'));
        if (scaleInstance) {
            awsArchitecture.services = awsArchitecture.services.filter(s => s !== scaleInstance);
            alert('📉 Instance terminated gracefully\nCost savings: $434/hour');
        }
    }
}

function addSpotInstance() {
    if (awsArchitecture) {
        const spotInstance = {
            id: `SPOT_${Date.now()}`,
            name: 'Spot Instance',
            x: 300 + Math.random() * 200,
            y: 150 + Math.random() * 200,
            radius: 40,
            baseRadius: 40,
            color: '#ffa502',
            gradient: ['#ffa502', '#ff6b35'],
            activity: 0,
            pulse: 0,
            awsService: 'EC2',
            instanceType: 'p3.8xlarge',
            vCPUs: 32,
            memory: 244,
            utilization: 65,
            throughput: '420 tokens/sec',
            latency: 35,
            healthStatus: 'Healthy',
            launchTime: Date.now(),
            slaTarget: 95.0,
            costPerHour: 89, // 70% savings
            isSpot: true,
            availabilityZone: 'us-east-1d',
            organelles: awsArchitecture.createOrganelles(6),
            membrane: {thickness: 2, opacity: 0.8},
            reliabilityScore: 96.5
        };

        awsArchitecture.services.push(spotInstance);
        alert('💰 Spot instance launched!\n70% cost savings: $89/hour vs $298/hour');
    }
}

function simulateFailure() {
    if (awsArchitecture && awsArchitecture.services.length > 0) {
        const targetService = awsArchitecture.services[Math.floor(Math.random() * awsArchitecture.services.length)];
        targetService.healthStatus = 'Critical';
        targetService.reliabilityScore = Math.max(80, targetService.reliabilityScore - 15);
        targetService.utilization = 0;

        // Create failure ripple effect
        awsArchitecture.createRipple(targetService.x, targetService.y, '#ff0000');

        alert(`🚨 CRITICAL FAILURE DETECTED!\nService: ${targetService.name}\nAuto-failover initiated...\nEstimated recovery: 2-3 minutes`);

        // Auto-recovery after 10 seconds
        setTimeout(() => {
            targetService.healthStatus = 'Healthy';
            targetService.reliabilityScore = Math.min(99.5, targetService.reliabilityScore + 10);
            targetService.utilization = 45 + Math.random() * 30;
            alert(`✅ Service ${targetService.name} recovered successfully!`);
        }, 10000);
    }
}

function triggerFailover() {
    if (awsArchitecture) {
        // Simulate failover to backup region
        awsArchitecture.addCommunication('model-sync', 'SAGEMAKER_TRAINING', 'ECS_SERVING');
        awsArchitecture.addCommunication('data-transfer', 'S3_DATALAKE', 'EC2_TRAINING_NODES');

        alert('🔄 Failover to us-west-2 initiated\nTraffic rerouting in progress...\nRTO: <60 seconds, RPO: <30 seconds');
    }
}

function runHealthCheck() {
    if (awsArchitecture) {
        // Trigger health monitoring
        awsArchitecture.services.forEach(service => {
            awsArchitecture.addCommunication('monitoring', service.id, 'CLOUDWATCH_MONITORING');
        });

        setTimeout(() => {
            const healthyServices = awsArchitecture.services.filter(s => s.healthStatus === 'Healthy').length;
            const totalServices = awsArchitecture.services.length;
            const overallHealth = (healthyServices / totalServices * 100).toFixed(1);

            alert(`❤️ HEALTH CHECK REPORT:\nHealthy Services: ${healthyServices}/${totalServices}\nOverall Health: ${overallHealth}%\nAll systems operational`);
        }, 3000);
    }
}

function updateSpeed(value) {
    if (awsArchitecture) {
        awsArchitecture.animationSpeed = parseFloat(value);
        document.getElementById('speedValue').textContent = `${value}x`;
    }
}

function clearCommunications() {
    if (awsArchitecture) {
        awsArchitecture.communications = [];
    }
}

function togglePause() {
    if (awsArchitecture) {
        awsArchitecture.isPaused = !awsArchitecture.isPaused;
        const button = event.target;
        button.textContent = awsArchitecture.isPaused ? '▶️ Resume' : '⏸️ Pause';
    }
}

function resetArchitecture() {
    if (awsArchitecture) {
        awsArchitecture.services = [];
        awsArchitecture.communications = [];
        awsArchitecture.isTraining = false;
        awsArchitecture.trainingProgress = 0;
        document.getElementById('trainingProgress').style.display = 'none';

        awsArchitecture.awsMetrics = {
            trainingInstances: 4,
            gpuUtilization: 78,
            modelParams: '70B',
            trainingLoss: 2.34,
            throughput: '1.2k tokens/sec',
            dataProcessed: '2.3TB',
            networkIO: '450 MB/s',
            reliabilityScore: 99.2,
            costPerHour: 892
        };

        awsArchitecture.initializeAWSServices();
    }
}

// Add createRipple method to the class
AWSGenAIArchitecture.prototype.createRipple = function (x, y, color) {
    const ripple = {
        x, y, color,
        radius: 0,
        maxRadius: 150,
        opacity: 1,
        growing: true
    };

    const animateRipple = () => {
        if (ripple.growing) {
            ripple.radius += 5;
            ripple.opacity -= 0.02;

            if (ripple.radius >= ripple.maxRadius || ripple.opacity <= 0) {
                return;
            }

            this.drawRipple(ripple);
            requestAnimationFrame(animateRipple);
        }
    };

    animateRipple();
};

AWSGenAIArchitecture.prototype.drawRipple = function (ripple) {
    this.ctx.strokeStyle = `${ripple.color}${Math.floor(ripple.opacity * 255).toString(16).padStart(2, '0')}`;
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    this.ctx.stroke();
};
