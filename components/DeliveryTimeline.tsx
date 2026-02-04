import React from 'react';
import { DeliveryStatus } from '../types';

interface DeliveryTimelineProps {
    status: DeliveryStatus;
    pickupTimestamp?: string;
    deliveryTimestamp?: string;
    createdAt: string;
}

const DeliveryTimeline: React.FC<DeliveryTimelineProps> = ({
    status,
    pickupTimestamp,
    deliveryTimestamp,
    createdAt
}) => {
    const steps = [
        { key: 'WAITING_FOR_TRANSPORTER', label: 'Waiting for Transporter', icon: '🔍' },
        { key: 'TRANSPORTER_ASSIGNED', label: 'Transporter Assigned', icon: '✅' },
        { key: 'PICKED_UP', label: 'Picked Up', icon: '📦' },
        { key: 'IN_TRANSIT', label: 'In Transit', icon: '🚚' },
        { key: 'DELIVERED', label: 'Delivered', icon: '📍' },
        { key: 'COMPLETED', label: 'Completed', icon: '🎉' }
    ];

    const statusOrder = [
        'WAITING_FOR_TRANSPORTER',
        'TRANSPORTER_ASSIGNED',
        'PICKED_UP',
        'IN_TRANSIT',
        'DELIVERED',
        'COMPLETED'
    ];

    const currentIndex = statusOrder.indexOf(status);

    const getTimestamp = (stepKey: string) => {
        if (stepKey === 'PICKED_UP' && pickupTimestamp) {
            return new Date(pickupTimestamp).toLocaleString();
        }
        if (stepKey === 'DELIVERED' && deliveryTimestamp) {
            return new Date(deliveryTimestamp).toLocaleString();
        }
        if (stepKey === 'WAITING_FOR_TRANSPORTER') {
            return new Date(createdAt).toLocaleString();
        }
        return null;
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Delivery Timeline</h3>

            <div className="space-y-4">
                {steps.map((step, index) => {
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;
                    const timestamp = getTimestamp(step.key);

                    return (
                        <div key={step.key} className="flex items-start gap-4">
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${isCompleted
                                    ? 'bg-green-100 border-2 border-green-500'
                                    : 'bg-gray-100 border-2 border-gray-300'
                                } ${isCurrent ? 'ring-4 ring-green-100 scale-110' : ''}`}>
                                {step.icon}
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h4 className={`font-bold ${isCompleted ? 'text-gray-900' : 'text-gray-400'
                                        }`}>
                                        {step.label}
                                    </h4>
                                    {isCurrent && (
                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                            Current
                                        </span>
                                    )}
                                </div>
                                {timestamp && (
                                    <p className="text-sm text-gray-500 mt-1">{timestamp}</p>
                                )}
                            </div>

                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <div className={`absolute left-[1.5rem] mt-12 w-0.5 h-8 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'
                                    }`} style={{ marginLeft: '1.5rem' }} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DeliveryTimeline;
